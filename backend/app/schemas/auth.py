from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class SendCodeRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
    workspace_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class CurrentUser(BaseModel):
    id: str
    email: str
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    role: str
    workspace_id: Optional[str] = None
    workspace_name: Optional[str] = None
    department: Optional[str] = None
    created_at: datetime


class RefreshTokenRequest(BaseModel):
    refresh_token: str