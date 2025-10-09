import os
import secrets
from typing import List
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
    
    # CORS
    @property
    def cors_allow_origins(self) -> List[str]:
        return [self.frontend_url]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()




