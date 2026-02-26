import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.mongo import collection
from app.services.mistral import call_agent

router = APIRouter(prefix='/api/use-cases', tags=['use-cases'])


class DomainRequest(BaseModel):
    domain: str
    user_role: str
    objective: str


class CompanyRequest(BaseModel):
    company_name: str


# ---------------------------------------------------------------------------
# Helper: extract individual use case names from the AI agent response.
# Mirrors the frontend extractUC() logic so it handles multiple formats.
# ---------------------------------------------------------------------------

def _find_deep_array(obj):
    """Recursively search for an array that looks like use cases."""
    if not isinstance(obj, dict):
        return None
    if isinstance(obj.get('use_cases'), list):
        return obj['use_cases']
    for val in obj.values():
        if isinstance(val, list):
            if val and isinstance(val[0], dict) and any(
                k in val[0] for k in ('title', 'use_case', 'name')
            ):
                return val
        elif isinstance(val, dict):
            found = _find_deep_array(val)
            if found is not None:
                return found
    return None


def _extract_items(resp):
    """Return a list of use-case dicts from the agent response."""
    if not resp:
        return []
    if isinstance(resp, list):
        return resp
    if isinstance(resp, dict):
        if isinstance(resp.get('use_cases'), list):
            return resp['use_cases']
        if 'agent_response' in resp:
            return _extract_items(resp['agent_response'])
        for key in ('items', 'results', 'data'):
            if isinstance(resp.get(key), list):
                return resp[key]
        deep = _find_deep_array(resp)
        if deep is not None:
            return deep
        # Try parsing Mistral text content
        try:
            txt = ''
            choices = resp.get('choices')
            if isinstance(choices, list) and choices:
                msg = choices[0]
                if isinstance(msg, dict):
                    content = msg.get('message', {})
                    if isinstance(content, dict):
                        txt = (content.get('content') or '').strip()
            if not txt:
                return []
            m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', txt, re.IGNORECASE)
            if m:
                txt = m.group(1).strip()
            else:
                txt = re.sub(r'^```[a-z]*\n?', '', txt)
                txt = re.sub(r'```$', '', txt).strip()
            parsed = json.loads(txt)
            if isinstance(parsed, list):
                return parsed
            deep_p = _find_deep_array(parsed)
            return deep_p if deep_p else []
        except Exception:
            return []
    return []


def extract_use_case_names(response) -> list[str]:
    """Return a deduplicated list of use case name strings from the response."""
    items = _extract_items(response)
    names: list[str] = []
    seen: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        name = item.get('title') or item.get('use_case') or item.get('name') or ''
        name = str(name).strip()
        if name and name not in seen:
            names.append(name)
            seen.add(name)
    return names


async def _update_tracking_set(user_id: str, type_name: str, names: list[str]):
    """Atomicly add new names to the user's persistent set for this discovery type."""
    if not names:
        return
    await collection('use_case_tracking').update_one(
        {'user_id': user_id, 'type': type_name},
        {'$addToSet': {'names': {'$each': names}}},
        upsert=True
    )


@router.post('/domain')
async def discover_domain(payload: DomainRequest, current_user=Depends(get_current_user)):
    message = (
        f'domain: {payload.domain},user_role: {payload.user_role},objective: {payload.objective}\n\n'
        "IMPORTANT: For 'functional_steps', DO NOT prefix items with 'Step 1:', 'Step 2:', etc. Provide just the description text."
    )
    try:
        response = await call_agent(settings.USE_CASE_AGENT_ID, message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The AI service is temporarily unavailable. Please try again later.") from exc

    all_names = extract_use_case_names(response)
    await _update_tracking_set(current_user['id'], 'domain', all_names)

    doc = {
        'user_id': current_user['id'],
        'input': payload.model_dump(),
        'formatted_message': message,
        'agent_response': response,
        'use_case_names': all_names, # Store all names for this specific run
        'status': 'Completed',
        'agent_error': None,
        'created_at': datetime.now(timezone.utc),
    }
    await collection('domain_use_cases').insert_one(doc)
    doc['_id'] = str(doc['_id'])
    return doc


@router.post('/company')
async def discover_company(payload: CompanyRequest, current_user=Depends(get_current_user)):
    message = (
        f'{payload.company_name}\n\n'
        "IMPORTANT: For 'functional_steps', DO NOT prefix items with 'Step 1:', 'Step 2:', etc. Provide just the description text."
    )
    try:
        response = await call_agent(settings.COMPANY_USE_CASE_AGENT_ID, message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The AI service is temporarily unavailable. Please try again later.") from exc

    all_names = extract_use_case_names(response)
    await _update_tracking_set(current_user['id'], 'company', all_names)

    doc = {
        'user_id': current_user['id'],
        'input': payload.model_dump(),
        'formatted_message': payload.company_name,
        'agent_response': response,
        'use_case_names': all_names,
        'status': 'Completed',
        'agent_error': None,
        'created_at': datetime.now(timezone.utc),
    }
    await collection('company_use_cases').insert_one(doc)
    doc['_id'] = str(doc['_id'])
    return doc
