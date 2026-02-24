from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    company_name: str = Field(min_length=2)
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def check_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must have at least 8 characters')
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: dict


class UserOut(BaseModel):
    id: str
    company_name: str
    email: EmailStr
    email_verified: bool
    evaluation_count: int = 0
    evaluation_limit: int = 20
    support_email: str | None = None
    created_at: datetime
