from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.db.mongo import collection

router = APIRouter(prefix='/api/dashboard', tags=['dashboard'])


def score_from_item(item: dict) -> float | None:
    content = item.get('parsed_content')
    if isinstance(content, dict):
        value = content.get('automation_feasibility_score')
        if isinstance(value, (int, float)):
            return float(value)
    return None


def fitment_from_item(item: dict) -> str | None:
    content = item.get('parsed_content')
    if isinstance(content, dict):
        fitment = content.get('fitment')
        if isinstance(fitment, str) and fitment.strip():
            return fitment.strip()
    return None  # Return None if not available — skip in counter


@router.get('')
async def dashboard(
    current_user=Depends(get_current_user),
    days: int = Query(default=30, ge=1, le=365),
    shortlisted: bool = Query(default=False),
):
    # Compute date range cutoff in UTC
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    query = {
        'user_id': current_user['id'],
        'created_at': {'$gte': cutoff},
    }
    query_all = {'user_id': current_user['id']}
    
    if shortlisted:
        query['shortlisted'] = True
        query_all['shortlisted'] = True

    cursor_ranged = collection('evaluations').find(query)
    total_all = await collection('evaluations').count_documents(query_all)

    total = 0
    scores = []
    trend_counts: dict[str, int] = defaultdict(int)
    trend_scores: dict[str, list[float]] = defaultdict(list)
    fitment_counter: Counter = Counter()

    async for item in cursor_ranged:
        total += 1
        score = score_from_item(item)
        if score is not None:
            scores.append(score)

        created_at = item.get('created_at')
        if isinstance(created_at, datetime):
            key = created_at.strftime('%Y-%m-%d')
            trend_counts[key] += 1
            if score is not None:
                trend_scores[key].append(score)

        fitment = fitment_from_item(item)
        if fitment:
            fitment_counter[fitment] += 1

    # All-time total for the stat card (regardless of date filter)
    total_all = await collection('evaluations').count_documents({'user_id': current_user['id']})

    avg = round(sum(scores) / len(scores), 1) if scores else 0

    # Build evaluation trend: count + average score per day
    trend = [
        {
            'date': k,
            'count': trend_counts[k],
            'avg_score': round(sum(trend_scores[k]) / len(trend_scores[k]), 1) if trend_scores[k] else 0,
        }
        for k in sorted(trend_counts.keys())
    ]

    # Technology distribution — only items with a known fitment
    distribution = [
        {'technology': k, 'count': v}
        for k, v in sorted(fitment_counter.items(), key=lambda x: -x[1])
    ]

    return {
        'total_evaluations': total_all,
        'evaluations_in_range': total,
        'average_automation_score': avg,
        'date_range_days': days,
        'charts': {
            'evaluation_trend': trend,
            'technology_distribution': distribution,
        },
    }
