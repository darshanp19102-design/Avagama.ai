import json
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.mongo import collection
from app.services.mistral import call_agent

router = APIRouter(prefix='/api/evaluations', tags=['evaluations'])


def fallback_content(process_name, description, frequency, exception_rate, risk_tolerance, compliance_sensitivity) -> dict:
    return {
        'automation_feasibility_score': 70,
        'business_benefit_score': {'score': 65},
        'fitment': 'Agentic AI',
        'dimensions': {
            'knowledge_intensity': 'Medium',
            'decision_intensity': 'High',
            'data_structure': 'Structured',
            'context_awareness': 'Medium',
            'exception_handling': max(0, min(100, int(exception_rate))),
            'orchestration_complexity': 'Medium',
            'process_volume': 'Medium',
            'process_frequency': 'High' if 'daily' in frequency.lower() else 'Medium',
            'risk_tolerance': risk_tolerance or 'Medium',
            'compliance_sensitivity': compliance_sensitivity or 'Medium',
        },
        'recommendations': {
            'llm_recommendation': 'small_LLM',
            'top_point_solutions': ['SAP Ariba', 'Coupa', 'Ivalua'],
            'top_models': ['Mistral 7B', 'Llama 2 13B', 'Gemma 7B'],
        },
    }


def extract_content(agent_json: dict):
    try:
        content = agent_json['choices'][0]['message']['content']
        if isinstance(content, str):
            text = content.strip()
            if text.startswith('```'):
                text = text.split('\n', 1)[1] if '\n' in text else text
                if text.endswith('```'):
                    text = text[:-3]
                text = text.strip()
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    if 'process_characteristics' not in parsed and isinstance(parsed.get('dimensions'), dict):
                        parsed['process_characteristics'] = parsed['dimensions']
                    return parsed
                return {'raw_text': content}
            except json.JSONDecodeError:
                return {'raw_text': content}
        return content
    except Exception:
        return None


async def _read_sop_text(sop_file: UploadFile) -> str:
    """Read text content from an uploaded SOP file (PDF or TXT)."""
    content_bytes = await sop_file.read()
    filename = (sop_file.filename or '').lower()
    if filename.endswith('.pdf'):
        try:
            import io
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(content_bytes))
            pages_text = [page.extract_text() or '' for page in reader.pages]
            return '\n'.join(pages_text).strip()
        except Exception:
            return ''
    else:
        # .txt or other text files
        try:
            return content_bytes.decode('utf-8', errors='replace').strip()
        except Exception:
            return ''


@router.post('')
async def submit_evaluation(
    process_name: str = Form(...),
    description: str = Form(...),
    volume: str = Form(''),
    frequency: str = Form(''),
    exception_rate: int = Form(0),
    complexity: int = Form(0),
    risk_tolerance: str = Form(''),
    compliance_sensitivity: str = Form(''),
    decision_points: str = Form(''),
    sop_file: UploadFile | None = File(None),
    current_user=Depends(get_current_user),
):
    # Read SOP file content if provided
    sop_text = ''
    sop_metadata = None
    if sop_file and sop_file.filename:
        sop_text = await _read_sop_text(sop_file)
        sop_metadata = {
            'filename': sop_file.filename,
            'content_type': sop_file.content_type or 'application/octet-stream',
            'size': len(sop_text),
        }

    formatted = (
        f"{process_name}\n"
        f"{description}\n"
        f"process_volume: {volume}\n"
        f"process_frequency: {frequency}\n"
        f"exception_rate: {exception_rate}%\n"
        f"process_complexity: {complexity}\n"
        f"risk_tolerance: {risk_tolerance}\n"
        f"compliance_sensitivity: {compliance_sensitivity}\n"
        f"decision_points: {decision_points}"
    )
    if sop_text:
        formatted += f"\n\n--- SOP Document Content ---\n{sop_text}"

    agent_response = None
    content = None
    try:
        agent_response = await call_agent(settings.PROCESS_AGENT_ID, formatted)
        content = extract_content(agent_response)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Mistral AI agent failed: {str(exc)}") from exc

    doc = {
        'user_id': current_user['id'],
        'process_name': process_name,
        'submitted_payload': {
            'process_name': process_name,
            'description': description,
            'volume': volume,
            'frequency': frequency,
            'exception_rate': exception_rate,
            'complexity': complexity,
            'risk_tolerance': risk_tolerance,
            'compliance_sensitivity': compliance_sensitivity,
            'decision_points': decision_points,
            'sop_metadata': sop_metadata,
        },
        'formatted_message': formatted,
        'agent_response': agent_response,
        'parsed_content': content,
        'agent_error': None,
        'status': 'Completed',
        'created_at': datetime.now(timezone.utc),
    }
    result = await collection('evaluations').insert_one(doc)
    doc['id'] = str(result.inserted_id)
    doc.pop('_id', None)
    return doc


@router.get('')
async def my_evaluations(current_user=Depends(get_current_user)):
    cursor = collection('evaluations').find({'user_id': current_user['id']}).sort('created_at', -1)
    rows = []
    async for item in cursor:
        content = item.get('parsed_content') if isinstance(item.get('parsed_content'), dict) else {}
        # feasibility_score can be a dict like { 'score': 65 } or a plain number
        feas = content.get('business_benefit_score')
        if isinstance(feas, dict):
            feas = feas.get('score') or feas.get('value') or 0
        # llm_type from recommendations
        recs = content.get('recommendations') or {}
        llm_type = recs.get('llm_recommendation') or recs.get('llm_type')
        rows.append(
            {
                'id': str(item['_id']),
                'process_name': item.get('process_name'),
                'created_at': item.get('created_at'),
                'automation_score': content.get('automation_feasibility_score'),
                'feasibility_score': feas,
                'fitment': content.get('fitment'),
                'llm_type': llm_type,
                'status': item.get('status', 'Completed'),
            }
        )
    return rows



@router.get('/{evaluation_id}')
async def get_evaluation(evaluation_id: str, current_user=Depends(get_current_user)):
    try:
        oid = ObjectId(evaluation_id)
    except InvalidId as exc:
        raise HTTPException(status_code=400, detail='Invalid evaluation id') from exc

    item = await collection('evaluations').find_one({'_id': oid, 'user_id': current_user['id']})
    if not item:
        raise HTTPException(status_code=404, detail='Evaluation not found')
    item['id'] = str(item.pop('_id'))
    return item


@router.delete('/{evaluation_id}')
async def delete_evaluation(evaluation_id: str, current_user=Depends(get_current_user)):
    try:
        oid = ObjectId(evaluation_id)
    except InvalidId as exc:
        raise HTTPException(status_code=400, detail='Invalid evaluation id') from exc

    result = await collection('evaluations').delete_one({'_id': oid, 'user_id': current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Evaluation not found or not authorized')
    return {'message': 'Evaluation deleted successfully'}

