from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class SendCodeRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class CurrentUser(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    created_at: datetime


class RefreshTokenRequest(BaseModel):
    refresh_token: str