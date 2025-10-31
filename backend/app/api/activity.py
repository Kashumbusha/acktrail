from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.security import require_admin_role
from ..models.database import get_db
from ..models.models import (
    Acknowledgment,
    Assignment,
    AssignmentStatus,
    Policy,
    User,
)
from ..schemas.reporting import ActivityLogItem, ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["activity"])


def _build_activity_item(
    *,
    event_id: UUID,
    event_type: str,
    description: str,
    created_at: datetime,
    policy_id: Optional[UUID] = None,
    policy_title: Optional[str] = None,
    actor_id: Optional[UUID] = None,
    actor_name: Optional[str] = None,
) -> ActivityLogItem:
    return ActivityLogItem(
        id=event_id,
        event_type=event_type,
        description=description,
        created_at=created_at,
        policy_id=policy_id,
        policy_title=policy_title,
        actor_id=actor_id,
        actor_name=actor_name,
    )


@router.get("/logs", response_model=ActivityLogResponse)
def list_activity_logs(
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(
        None,
        description="Filter by event type (policy_created, assignment_sent, acknowledgment_received)",
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role),
) -> ActivityLogResponse:
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    if event_type and event_type not in {"policy_created", "assignment_sent", "acknowledgment_received"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported event type",
        )

    events: List[ActivityLogItem] = []
    fetch_size = offset + limit + 50
    total_events = 0

    include_policy = event_type in (None, "policy_created")
    include_assignment = event_type in (None, "assignment_sent")
    include_ack = event_type in (None, "acknowledgment_received")

    def _policy_events() -> (int, List[ActivityLogItem]):
        query = (
            db.query(Policy)
            .filter(Policy.workspace_id == workspace_id if workspace_id else True)
            .order_by(Policy.created_at.desc())
        )
        count = query.count()
        items = [
            _build_activity_item(
                event_id=policy.id,
                event_type="policy_created",
                description=f"Policy '{policy.title}' was created",
                created_at=policy.created_at,
                policy_id=policy.id,
                policy_title=policy.title,
                actor_id=policy.created_by,
                actor_name=db.query(User.name).filter(User.id == policy.created_by).scalar() if policy.created_by else None,
            )
            for policy in query.limit(fetch_size)
        ]
        return count, items

    def _assignment_events() -> (int, List[ActivityLogItem]):
        query = (
            db.query(Assignment)
            .filter(Assignment.workspace_id == workspace_id if workspace_id else True)
            .order_by(Assignment.created_at.desc())
        )
        count = query.count()
        items: List[ActivityLogItem] = []
        for assignment in query.limit(fetch_size):
            policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
            user = db.query(User).filter(User.id == assignment.user_id).first()
            if not policy or not user:
                continue
            items.append(
                _build_activity_item(
                    event_id=assignment.id,
                    event_type="assignment_sent",
                    description=f"Policy '{policy.title}' was assigned to {user.name}",
                    created_at=assignment.created_at,
                    policy_id=policy.id,
                    policy_title=policy.title,
                    actor_id=user.id,
                    actor_name=user.name,
                )
            )
        return count, items

    def _ack_events() -> (int, List[ActivityLogItem]):
        query = (
            db.query(Acknowledgment)
            .join(Assignment, Assignment.id == Acknowledgment.assignment_id)
            .filter(Assignment.workspace_id == workspace_id if workspace_id else True)
            .order_by(Acknowledgment.created_at.desc())
        )
        count = query.count()
        items: List[ActivityLogItem] = []
        for ack in query.limit(fetch_size):
            assignment = db.query(Assignment).filter(Assignment.id == ack.assignment_id).first()
            if not assignment:
                continue
            policy = db.query(Policy).filter(Policy.id == assignment.policy_id).first()
            user = db.query(User).filter(User.id == assignment.user_id).first()
            if not policy or not user:
                continue
            items.append(
                _build_activity_item(
                    event_id=ack.id,
                    event_type="acknowledgment_received",
                    description=f"{user.name} acknowledged policy '{policy.title}'",
                    created_at=ack.created_at,
                    policy_id=policy.id,
                    policy_title=policy.title,
                    actor_id=user.id,
                    actor_name=user.name,
                )
            )
        return count, items

    if include_policy:
        count, items = _policy_events()
        total_events += count
        events.extend(items)
    if include_assignment:
        count, items = _assignment_events()
        total_events += count
        events.extend(items)
    if include_ack:
        count, items = _ack_events()
        total_events += count
        events.extend(items)

    if event_type:
        # When filtering by event type we counted only that type
        total_events = len(events) if total_events == 0 else total_events
    else:
        total_events = total_events or len(events)

    events.sort(key=lambda e: e.created_at, reverse=True)

    sliced_events = events[offset: offset + limit]

    return ActivityLogResponse(
        items=sliced_events,
        total=total_events,
        limit=limit,
        offset=offset,
    )

