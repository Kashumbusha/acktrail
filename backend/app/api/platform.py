from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from ..models.database import get_db
from ..models.models import Workspace, User, Policy, Assignment
from ..core.security import require_platform_admin
from ..core.config import settings

router = APIRouter(prefix="/platform", tags=["platform"])


@router.get("/stats", response_model=dict)
def platform_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_platform_admin)
) -> dict:
    total_workspaces = db.query(func.count(Workspace.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_policies = db.query(func.count(Policy.id)).scalar() or 0
    total_assignments = db.query(func.count(Assignment.id)).scalar() or 0

    # Simple last-30d counts (created_at based)
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=30)
    new_workspaces_30d = db.query(func.count(Workspace.id)).filter(Workspace.created_at >= since).scalar() or 0
    new_users_30d = db.query(func.count(User.id)).filter(User.created_at >= since).scalar() or 0

    return {
        "totals": {
            "workspaces": total_workspaces,
            "users": total_users,
            "policies": total_policies,
            "assignments": total_assignments,
        },
        "last30d": {
            "workspaces": new_workspaces_30d,
            "users": new_users_30d,
        },
        "platform_admins": settings.platform_admins,
    }


@router.get("/workspaces", response_model=dict)
def list_workspaces(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_platform_admin)
) -> dict:
    query = db.query(Workspace)
    if search:
        like = f"%{search}%"
        query = query.filter(Workspace.name.ilike(like))

    total = query.count()
    workspaces = query.order_by(Workspace.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for ws in workspaces:
        users_count = db.query(func.count(User.id)).filter(User.workspace_id == ws.id).scalar() or 0
        policies_count = db.query(func.count(Policy.id)).filter(Policy.workspace_id == ws.id).scalar() or 0
        assignments_count = db.query(func.count(Assignment.id)).filter(Assignment.workspace_id == ws.id).scalar() or 0

        items.append({
            "id": str(ws.id),
            "name": ws.name,
            "plan": ws.plan.value if hasattr(ws.plan, 'value') else str(ws.plan),
            "created_at": ws.created_at.isoformat(),
            "users_count": users_count,
            "policies_count": policies_count,
            "assignments_count": assignments_count,
        })

    return {
        "workspaces": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


