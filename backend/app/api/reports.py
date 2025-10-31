from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, desc, func
from sqlalchemy.orm import Session

from ..models.database import get_db
from ..models.models import Assignment, AssignmentStatus, Policy, Workspace
from ..core.security import require_admin_role
from ..schemas.reporting import PolicySnapshot, PolicyReportList, ReportsSummary

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_workspace(db: Session, workspace_id: Optional[UUID]) -> Optional[Workspace]:
    if not workspace_id:
        return None
    return db.query(Workspace).filter(Workspace.id == workspace_id).first()


def _policy_snapshots_query(db: Session, workspace_id: Optional[UUID]):
    status_case = lambda target_status: func.sum(case((Assignment.status == target_status, 1), else_=0))

    query = (
        db.query(
            Assignment.policy_id.label("policy_id"),
            func.count(Assignment.id).label("total"),
            status_case(AssignmentStatus.ACKNOWLEDGED).label("acknowledged"),
            status_case(AssignmentStatus.PENDING).label("pending"),
            status_case(AssignmentStatus.VIEWED).label("viewed"),
        )
        .filter(Assignment.workspace_id == workspace_id if workspace_id else True)
        .group_by(Assignment.policy_id)
    )

    return query.subquery()


def _policy_snapshot_from_row(policy: Policy, stats) -> PolicySnapshot:
    total = stats.total if stats else 0
    acknowledged = stats.acknowledged if stats else 0
    pending = stats.pending if stats else 0
    viewed = stats.viewed if stats else 0

    outstanding = max(total - acknowledged, 0)
    overdue = 0
    if policy.due_at:
        overdue = outstanding if policy.due_at < datetime.utcnow() else 0

    acknowledgment_rate = (acknowledged / total * 100) if total > 0 else 0.0

    return PolicySnapshot(
        id=policy.id,
        title=policy.title,
        total_assignments=total,
        acknowledged_assignments=acknowledged,
        pending_assignments=pending + viewed,
        overdue_assignments=overdue,
        acknowledgment_rate=round(acknowledgment_rate, 1),
        due_at=policy.due_at,
        created_at=policy.created_at,
    )


@router.get("/summary", response_model=ReportsSummary)
def get_reports_summary(
    top_limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role),
) -> ReportsSummary:
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    policy_stats_subquery = _policy_snapshots_query(db, workspace_id)

    policy_stats = (
        db.query(Policy, policy_stats_subquery)
        .outerjoin(policy_stats_subquery, Policy.id == policy_stats_subquery.c.policy_id)
        .filter(Policy.workspace_id == workspace_id if workspace_id else True)
    )

    total_policies = policy_stats.count()

    total_assignments = 0
    acknowledged_assignments = 0
    pending_assignments = 0
    overdue_assignments = 0
    active_policies = 0

    top_policies = []

    for row in policy_stats:
        policy = row[0]
        # Create stats object from row columns
        class Stats:
            def __init__(self, total, acknowledged, pending, viewed):
                self.total = total or 0
                self.acknowledged = acknowledged or 0
                self.pending = pending or 0
                self.viewed = viewed or 0

        stats = Stats(
            total=row[2] if len(row) > 2 else None,
            acknowledged=row[3] if len(row) > 3 else None,
            pending=row[4] if len(row) > 4 else None,
            viewed=row[5] if len(row) > 5 else None
        ) if len(row) > 1 else None

        snapshot = _policy_snapshot_from_row(policy, stats)
        total_assignments += snapshot.total_assignments
        acknowledged_assignments += snapshot.acknowledged_assignments
        pending_assignments += snapshot.pending_assignments
        overdue_assignments += snapshot.overdue_assignments
        if snapshot.pending_assignments > 0:
            active_policies += 1
        top_policies.append(snapshot)

    top_policies.sort(key=lambda p: (p.overdue_assignments, p.pending_assignments), reverse=True)
    acknowledgment_rate = (
        (acknowledged_assignments / total_assignments) * 100
        if total_assignments > 0
        else 0.0
    )

    return ReportsSummary(
        generated_at=datetime.utcnow(),
        total_policies=total_policies,
        active_policies=active_policies,
        total_assignments=total_assignments,
        acknowledged_assignments=acknowledged_assignments,
        pending_assignments=pending_assignments,
        overdue_assignments=overdue_assignments,
        acknowledgment_rate=round(acknowledgment_rate, 1),
        top_outstanding_policies=top_policies[:top_limit],
    )


@router.get("/policies", response_model=PolicyReportList)
def list_policy_reports(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role),
) -> PolicyReportList:
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    policy_stats_subquery = _policy_snapshots_query(db, workspace_id)

    policy_query = (
        db.query(Policy, policy_stats_subquery)
        .outerjoin(policy_stats_subquery, Policy.id == policy_stats_subquery.c.policy_id)
        .filter(Policy.workspace_id == workspace_id if workspace_id else True)
    )

    # Order by outstanding assignments desc then by due date
    policy_query = policy_query.order_by(
        desc((policy_stats_subquery.c.total - func.coalesce(policy_stats_subquery.c.acknowledged, 0))),
        Policy.due_at.isnot(None),
        Policy.due_at,
    )

    policy_items = (
        policy_query
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Create stats object from row columns
    class Stats:
        def __init__(self, total, acknowledged, pending, viewed):
            self.total = total or 0
            self.acknowledged = acknowledged or 0
            self.pending = pending or 0
            self.viewed = viewed or 0

    snapshots = []
    for row in policy_items:
        policy = row[0]
        stats = Stats(
            total=row[2] if len(row) > 2 else None,
            acknowledged=row[3] if len(row) > 3 else None,
            pending=row[4] if len(row) > 4 else None,
            viewed=row[5] if len(row) > 5 else None
        ) if len(row) > 1 else None
        snapshots.append(_policy_snapshot_from_row(policy, stats))

    return PolicyReportList(
        generated_at=datetime.utcnow(),
        policies=snapshots,
    )

