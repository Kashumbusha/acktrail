from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class PolicyBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    body_markdown: Optional[str] = None
    due_at: Optional[datetime] = None
    require_typed_signature: bool = False
    questions_enabled: bool = False

    @validator('body_markdown')
    def validate_content(cls, v, values):
        # At least one of body_markdown or file_url must be provided
        # This will be enforced at the API level where file_url is set
        return v


class PolicyCreate(PolicyBase):
    pass


class PolicyUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    body_markdown: Optional[str] = None
    due_at: Optional[datetime] = None
    require_typed_signature: Optional[bool] = None


class PolicyResponse(PolicyBase):
    id: UUID
    file_url: Optional[str] = None
    content_sha256: str
    version: int
    created_by: UUID
    created_at: datetime
    # Optional: include questions for admin views only (backend may choose not to populate)
    # This structure mirrors DB but should only be sent to admins
    # For recipients, use AckPageData.questions instead
    # questions: Optional[List["PolicyQuestion"]] = None

    class Config:
        from_attributes = True


class PolicyWithStats(PolicyResponse):
    total_assignments: int = 0
    pending_assignments: int = 0
    viewed_assignments: int = 0
    acknowledged_assignments: int = 0
    declined_assignments: int = 0
    overdue_assignments: int = 0
    creator_name: str

    class Config:
        from_attributes = True


class PolicyListResponse(BaseModel):
    policies: List[PolicyWithStats]
    total: int
    page: int
    per_page: int
    total_pages: int


class PolicyQuestion(BaseModel):
    id: UUID
    order_index: int
    prompt: str
    choices: List[str]

    class Config:
        from_attributes = True