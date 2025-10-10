import os
import secrets
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Settings(BaseSettings):
    # Core app
    app_name: str = "Policy Ack Tracker API"
    environment: str = "development"

    # Database
    database_url: str = ""

    # URLs
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Org config
    org_name: str = "PolicyTracker"
    sender_email: str = "kashustephen@gmail.com"
    sender_name: str = "PolicyTracker Team"

    # JWT
    jwt_secret: str = secrets.token_urlsafe(48)
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7
    magic_link_expire_days: int = 30

    # Brevo (Sendinblue)
    brevo_api_key: str = ""

    # Supabase
    supabase_project_url: str = ""
    supabase_project_api_key: str = ""

    # Backblaze B2
    b2_keyid: str = ""
    b2_keyname: str = ""
    b2_applicationkey: str = ""
    b2_bucket_name: str = "policy-ack-files"

    # CORS - can be set from environment variable or use default
    cors_allow_origins: Union[List[str], str] = ""

    @field_validator('cors_allow_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v, info):
        # If it's already a list, return it
        if isinstance(v, list):
            return v

        # If it's a JSON string from .env, parse it
        if isinstance(v, str) and v.strip():
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass

        # Default value for development
        frontend_url = info.data.get('frontend_url', 'http://localhost:5173')
        return [
            frontend_url,
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177"
        ]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()









