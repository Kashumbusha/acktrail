from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    link: Optional[str] = None


class NotificationCreate(NotificationBase):
    user_id: UUID
    workspace_id: UUID


class NotificationResponse(NotificationBase):
    id: UUID
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int


class UnreadCountResponse(BaseModel):
    count: int
