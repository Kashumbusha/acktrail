from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from ..models.database import get_db
from ..models.models import User, Assignment, Policy, UserRole
from ..core.security import get_current_user, require_admin_role

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/")
def list_users(
    type: Optional[str] = Query(None, description="staff|guests"),
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    query = db.query(User).filter(User.workspace_id == UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else True)
    if type == "staff":
        query = query.filter(User.is_guest == False)
    elif type == "guests":
        query = query.filter(User.is_guest == True)
    if search:
        search_like = f"%{search}%"
        query = query.filter((User.name.ilike(search_like)) | (User.email.ilike(search_like)))
    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()
    # basic shape for frontend
    return {
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.name,
                "role": u.role.value,
                "is_guest": u.is_guest,
                "can_login": u.can_login,
                "active": u.active,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.post("/invite")
def invite_user(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    email = (payload.get("email") or "").strip().lower()
    name = (payload.get("name") or email.split('@')[0]).strip()
    role = payload.get("role") or "employee"
    is_guest = bool(payload.get("is_guest", False))
    can_login = bool(payload.get("can_login", not is_guest))

    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email required")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=name)
        db.add(user)
        db.flush()

    user.role = UserRole(role)
    user.is_guest = is_guest
    user.can_login = can_login
    if current_user.get("workspace_id"):
        user.workspace_id = UUID(current_user["workspace_id"])  # type: ignore
    db.commit()
    return {"success": True, "id": str(user.id)}


@router.patch("/{user_id}")
def update_user(
    user_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if "name" in payload:
        user.name = payload["name"]
    if "role" in payload:
        user.role = UserRole(payload["role"])
    if "can_login" in payload:
        user.can_login = bool(payload["can_login"])
    if "active" in payload:
        user.active = bool(payload["active"])
    db.commit()
    return {"success": True}


@router.get("/{user_id}/assignments")
def user_assignments(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_role)
):
    assignments = db.query(Assignment).filter(Assignment.user_id == user_id).all()
    result = []
    for a in assignments:
        policy = db.query(Policy).filter(Policy.id == a.policy_id).first()
        result.append({
            "id": str(a.id),
            "status": a.status.value,
            "policy_title": policy.title if policy else "",
            "created_at": a.created_at.isoformat(),
            "viewed_at": a.viewed_at.isoformat() if a.viewed_at else None,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        })
    return {"assignments": result}


