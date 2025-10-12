from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
import logging

from ..schemas.notifications import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse
)
from ..models.database import get_db
from ..models.models import Notification
from ..core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    limit: int = 50,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> NotificationListResponse:
    """Get all notifications for the current user."""

    user_id = UUID(current_user["id"])
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    # Get notifications for the user
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.workspace_id == workspace_id if workspace_id else True
    ).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    # Get unread count
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.workspace_id == workspace_id if workspace_id else True,
        Notification.read == False
    ).count()

    return NotificationListResponse(
        notifications=[NotificationResponse.from_orm(n) for n in notifications],
        unread_count=unread_count
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> UnreadCountResponse:
    """Get count of unread notifications for the current user."""

    user_id = UUID(current_user["id"])
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.workspace_id == workspace_id if workspace_id else True,
        Notification.read == False
    ).count()

    return UnreadCountResponse(count=count)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> NotificationResponse:
    """Mark a notification as read."""

    user_id = UUID(current_user["id"])

    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.read = True
    db.commit()
    db.refresh(notification)

    return NotificationResponse.from_orm(notification)


@router.put("/mark-all-read")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Mark all notifications as read for the current user."""

    user_id = UUID(current_user["id"])
    workspace_id = UUID(current_user["workspace_id"]) if current_user.get("workspace_id") else None

    updated_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.workspace_id == workspace_id if workspace_id else True,
        Notification.read == False
    ).update({"read": True})

    db.commit()

    return {"message": f"Marked {updated_count} notifications as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Delete a notification."""

    user_id = UUID(current_user["id"])

    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted successfully"}
