from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time
from typing import Dict, Any

from .core.config import settings
from .models.database import engine, Base

# Import all routers
from .api.auth import router as auth_router
from .api.policies import router as policies_router
from .api.assignments import router as assignments_router, assignment_router
from .api.acknowledgments import router as acknowledgments_router
from .api.dashboard import router as dashboard_router
from .api.reports import router as reports_router
from .api.activity import router as activity_router
from .api.teams import router as teams_router
from .api.users import router as users_router
from .api.platform import router as platform_router
from .api.notifications import router as notifications_router
from .api.payments import router as payments_router
from .api.webhooks import router as webhooks_router
from .api.support import router as support_router
from .api.sso import router as sso_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class RequestLoggingMiddleware:
    """Middleware to log all API requests."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            start_time = time.time()

            # Log the request
            logger.info(f"Request: {request.method} {request.url}")

            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    process_time = time.time() - start_time
                    status_code = message["status"]
                    logger.info(f"Response: {status_code} - {process_time:.3f}s")
                await send(message)

            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)


class ProxyHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to handle X-Forwarded-* headers from Railway/Vercel proxy."""

    async def dispatch(self, request: Request, call_next):
        # Get the X-Forwarded-Proto header (set by Railway)
        forwarded_proto = request.headers.get("x-forwarded-proto")

        if forwarded_proto == "https":
            # Override the URL scheme to https for redirect generation
            request.scope["scheme"] = "https"

        response = await call_next(request)
        return response


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    logger.info("=" * 60)
    logger.info("Starting application initialization")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Frontend URL: {settings.frontend_url}")
    logger.info(f"Database URL configured: {bool(settings.database_url)}")
    logger.info("=" * 60)

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="Policy Acknowledgment Tracker API",
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url="/redoc" if settings.environment == "development" else None,
    )

    # Create database tables
    try:
        if engine is not None:
            logger.info("Attempting to create database tables...")
            Base.metadata.create_all(bind=engine)
            logger.info("✓ Database tables created successfully")
        else:
            logger.warning("⚠ Skipping database table creation - database not configured")
    except Exception as e:
        logger.error(f"✗ Failed to create database tables: {e}")
        logger.exception(e)

    # Add middleware
    # Proxy headers middleware (must be first to handle X-Forwarded-* headers)
    app.add_middleware(ProxyHeadersMiddleware)

    if settings.environment == "production":
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*"]  # Configure this properly for production
        )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],  # For file downloads
    )
    
    # Request logging middleware
    if settings.environment == "development":
        app.add_middleware(RequestLoggingMiddleware)

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Global exception on {request.url}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}
        )

    # Include routers with proper prefixes
    app.include_router(auth_router, prefix="/api")
    app.include_router(policies_router, prefix="/api")
    app.include_router(assignments_router, prefix="/api")
    app.include_router(assignment_router, prefix="/api")
    app.include_router(acknowledgments_router, prefix="/api")
    app.include_router(dashboard_router, prefix="/api")
    app.include_router(reports_router, prefix="/api")
    app.include_router(activity_router, prefix="/api")
    app.include_router(teams_router, prefix="/api")
    app.include_router(users_router, prefix="/api")
    app.include_router(platform_router, prefix="/api")
    app.include_router(notifications_router, prefix="/api")
    app.include_router(payments_router, prefix="/api/payments", tags=["payments"])
    app.include_router(webhooks_router, prefix="/api/webhooks", tags=["webhooks"])
    app.include_router(support_router, prefix="/api", tags=["support"])
    app.include_router(sso_router, prefix="/api/sso", tags=["sso"])

    # Health check endpoint
    @app.get("/health", tags=["health"])
    def health_check() -> Dict[str, Any]:
        """Health check endpoint."""
        return {
            "status": "healthy",
            "environment": settings.environment,
            "timestamp": time.time()
        }

    # Root endpoint
    @app.get("/", tags=["root"])
    def root() -> Dict[str, str]:
        """Root endpoint."""
        return {
            "message": f"Welcome to {settings.app_name}",
            "docs": "/docs" if settings.environment == "development" else "Documentation not available in production",
            "health": "/health"
        }

    # Add startup event
    @app.on_event("startup")
    async def startup_event():
        logger.info(f"Starting {settings.app_name} in {settings.environment} environment")

    # Add shutdown event
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info(f"Shutting down {settings.app_name}")

    return app


# Create the app instance
app = create_app()

# For running with uvicorn directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development"
    )


