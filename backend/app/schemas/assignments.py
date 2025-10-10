from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.models import AssignmentStatus


class AssignmentBase(BaseModel):
    policy_id: UUID
    user_id: UUID


class AssignmentCreate(BaseModel):
    user_id: UUID


class AssignmentUpdate(BaseModel):
    status: Optional[AssignmentStatus] = None


class AssignmentResponse(AssignmentBase):
    id: UUID
    status: AssignmentStatus
    viewed_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    reminder_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class AssignmentWithDetails(AssignmentResponse):
    user_name: str
    user_email: str
    user_department: Optional[str]
    policy_title: str
    policy_due_at: Optional[datetime]
    has_acknowledgment: bool = False

    class Config:
        from_attributes = True


class AssignmentListResponse(BaseModel):
    assignments: List[AssignmentWithDetails]
    total: int
    page: int
    per_page: int
    total_pages: int


class RecipientCreate(BaseModel):
    recipients: List[EmailStr] = Field(..., min_items=1)


class SendPolicyRequest(BaseModel):
    assignment_ids: Optional[List[UUID]] = None  # If None, send to all pending assignments


class BulkAssignmentResponse(BaseModel):
    created_assignments: int
    sent_emails: int
    failed_emails: List[str] = []