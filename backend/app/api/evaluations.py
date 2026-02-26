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
    is_draft: bool = Form(False),
    evaluation_id: str | None = Form(None),
    sop_file: UploadFile | None = File(None),
    current_user=Depends(get_current_user),
):
    # Enforce evaluation limits ONLY for non-drafts
    users_col = collection('users')
    user = await users_col.find_one({'_id': ObjectId(current_user['id'])})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    
    # If it's NOT a draft, check limits
    if not is_draft:
        evaluation_count = user.get('evaluation_count', 0)
        evaluation_limit = user.get('evaluation_limit', 20)
        if evaluation_count >= evaluation_limit:
            raise HTTPException(status_code=403, detail='You have reached your evaluation limit.')

    # Read SOP file content if provided
    sop_text = ''
    sop_metadata = None
    if sop_file and sop_file.filename:
        # For simplicity, we only read if it's a real file. 
        # In a full draft implementation, we might want to preserve sop_metadata if no new file is uploaded
        sop_text = await _read_sop_text(sop_file)
        sop_metadata = {
            'filename': sop_file.filename,
            'content_type': sop_file.content_type or 'application/octet-stream',
            'size': len(sop_text),
        }

    agent_response = None
    content = None
    formatted = ""
    
    if not is_draft:
        formatted = (
            f"{process_name}\n"
            f"{description}\n"
            f"process_volume: {volume}\n"
            f"process_frequency: {frequency}\n"
            f"exception_rate: {exception_rate}%\n"
            f"process_complexity: {complexity}\n"
            f"risk_tolerance: {risk_tolerance}\n"
            f"compliance_sensitivity: {compliance_sensitivity}\n"
            f"decision_points: {decision_points}\n\n"
            "IMPORTANT JSON SCHEMA REQUIREMENT:\n"
            "For any 'dimensions', 'process_characteristics', or scoring criteria in your JSON output, "
            "do NOT just return a simple string (like 'high' or 'medium'). Instead, return an object for each dimension containing:\n"
            "- 'score': A numerical score (e.g., 75, 8.5)\n"
            "- 'weight': A numerical weight (e.g., 100, 10)\n"
            "- 'value': The string value ('High', 'Medium', 'Low')\n"
            "- 'justification': A detailed 1-2 sentence explanation justifying the assigned score.\n"
            "Example: 'knowledge_intensity': { 'score': 80, 'weight': 100, 'value': 'High', 'justification': 'Requires deep domain expertise...' }"
        )
        if sop_text:
            formatted += f"\n\n--- SOP Document Content ---\n{sop_text}"

        try:
            agent_response = await call_agent(settings.PROCESS_AGENT_ID, formatted)
            content = extract_content(agent_response)
        except Exception as exc:
            raise HTTPException(status_code=502, detail="The AI service is temporarily unavailable. Please try again later.") from exc

    doc_id = None
    if evaluation_id:
        try:
            doc_id = ObjectId(evaluation_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid evaluation_id")

    payload = {
        'process_name': process_name,
        'description': description,
        'volume': volume,
        'frequency': frequency,
        'exception_rate': exception_rate,
        'complexity': complexity,
        'risk_tolerance': risk_tolerance,
        'compliance_sensitivity': compliance_sensitivity,
        'decision_points': decision_points,
    }
    if sop_metadata:
        payload['sop_metadata'] = sop_metadata

    doc_updates = {
        'user_id': current_user['id'],
        'process_name': process_name,
        'submitted_payload': payload,
        'formatted_message': formatted,
        'agent_response': agent_response,
        'parsed_content': content,
        'agent_error': None,
        'status': 'Draft' if is_draft else 'Completed',
        'is_shortlisted': False,
        'updated_at': datetime.now(timezone.utc),
    }
    
    if not doc_id:
        doc_updates['created_at'] = datetime.now(timezone.utc)
        result = await collection('evaluations').insert_one(doc_updates)
        final_id = str(result.inserted_id)
        # Increment user's evaluation count ONLY for new non-draft submissions
        if not is_draft:
            await users_col.update_one(
                {'_id': ObjectId(current_user['id'])},
                {'$inc': {'evaluation_count': 1}}
            )
    else:
        # Check ownership
        existing = await collection('evaluations').find_one({'_id': doc_id, 'user_id': current_user['id']})
        if not existing:
            raise HTTPException(status_code=404, detail="Evaluation not found or unauthorized")
        
        # If it WAS a draft and is now being COMPLETED, increment count
        if existing.get('status') == 'Draft' and not is_draft:
            await users_col.update_one(
                {'_id': ObjectId(current_user['id'])},
                {'$inc': {'evaluation_count': 1}}
            )
            
        await collection('evaluations').update_one({'_id': doc_id}, {'$set': doc_updates})
        final_id = evaluation_id

    doc_updates['id'] = final_id
    doc_updates.pop('_id', None)
    return doc_updates


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
                'is_shortlisted': item.get('is_shortlisted', False),
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


from pydantic import BaseModel

class ShortlistRequest(BaseModel):
    evaluation_ids: list[str]
    shortlist_status: bool

@router.put('/shortlist')
async def update_shortlist_status(payload: ShortlistRequest, current_user=Depends(get_current_user)):
    try:
        oids = [ObjectId(eid) for eid in payload.evaluation_ids]
    except InvalidId as exc:
        raise HTTPException(status_code=400, detail='One or more invalid evaluation ids') from exc

    # Check if any of these evaluations are already shortlisted
    existing = await collection('evaluations').find(
        {'_id': {'$in': oids}, 'user_id': current_user['id'], 'is_shortlisted': True}
    ).to_list(length=1)
    
    if existing:
        raise HTTPException(status_code=400, detail='This evaluation is already shortlisted.')

    result = await collection('evaluations').update_many(
        {
            '_id': {'$in': oids},
            'user_id': current_user['id']
        },
        {
            '$set': {
                'is_shortlisted': True,
                'status': 'Shortlisted'
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='No evaluations found or not authorized')
        
    return {'message': f'Shortlist status updated for {result.modified_count} evaluations'}

