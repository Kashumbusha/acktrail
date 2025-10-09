from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.models import AckMethod


class AcknowledgmentBase(BaseModel):
    signer_name: str = Field(..., min_length=1, max_length=255)
    signer_email: EmailStr


class AcknowledgmentCreate(AcknowledgmentBase):
    ack_method: AckMethod = AckMethod.ONECLICK


class TypedAcknowledgmentCreate(AcknowledgmentBase):
    typed_signature: str = Field(..., min_length=1)
    ack_method: AckMethod = AckMethod.TYPED


class AcknowledgmentResponse(AcknowledgmentBase):
    id: UUID
    assignment_id: UUID
    typed_signature: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    policy_version: int
    policy_hash_at_ack: str
    ack_method: AckMethod
    created_at: datetime

    class Config:
        from_attributes = True


class AcknowledgmentWithDetails(AcknowledgmentResponse):
    policy_title: str
    policy_created_at: datetime
    user_name: str
    user_email: str
    user_department: Optional[str]

    class Config:
        from_attributes = True


class AckPageData(BaseModel):
    assignment_id: UUID
    policy_title: str
    policy_body_markdown: Optional[str]
    policy_file_url: Optional[str]
    policy_version: int
    policy_hash: str
    user_name: str
    user_email: str
    require_typed_signature: bool
    is_expired: bool = False
    already_acknowledged: bool = False