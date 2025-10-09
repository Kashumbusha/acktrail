from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.models import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    role: UserRole = UserRole.EMPLOYEE


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=255)
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: UUID
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithStats(UserResponse):
    total_assignments: int = 0
    pending_assignments: int = 0
    acknowledged_assignments: int = 0
    overdue_assignments: int = 0

    class Config:
        from_attributes = True