# Policy Acknowledgment Tracker - Backend

A FastAPI-based backend system for tracking policy acknowledgments with magic link authentication, PDF uploads, and email notifications.

## Features

- **Magic Link Authentication**: 6-digit code-based authentication via email
- **Policy Management**: Create, update, and manage policy documents (Markdown + PDF support)
- **Assignment Tracking**: Assign policies to users and track acknowledgment status
- **Email Integration**: Automated email notifications via Brevo
- **File Storage**: PDF storage on Backblaze B2
- **Audit Trail**: Complete audit trail with SHA-256 hashing for tamper detection
- **Receipt Generation**: PDF receipt generation for acknowledged policies
- **Dashboard & Reporting**: Statistics dashboard and CSV export functionality

## Architecture

### Core Components

1. **Authentication** (`/api/auth`)
   - `POST /api/auth/send-code` - Send 6-digit auth code via email
   - `POST /api/auth/verify-code` - Verify code and return JWT token
   - `GET /api/auth/me` - Get current user info

2. **Policy Management** (`/api/policies`)
   - `GET /api/policies` - List policies with pagination and stats
   - `POST /api/policies` - Create new policy (supports file upload)
   - `GET /api/policies/{id}` - Get specific policy
   - `PUT /api/policies/{id}` - Update policy
   - `DELETE /api/policies/{id}` - Delete policy

3. **Assignment Management** (`/api/policies/{id}/*`)
   - `POST /api/policies/{id}/recipients` - Add recipients to policy
   - `POST /api/policies/{id}/send` - Send assignment emails
   - `GET /api/policies/{id}/assignments` - List policy assignments
   - `POST /api/assignments/{id}/remind` - Send reminder email

4. **Acknowledgment System** (`/api/ack`)
   - `GET /api/ack/{token}` - Get acknowledgment page data
   - `POST /api/ack/{token}` - Submit acknowledgment
   - `GET /api/ack/assignment/{id}/receipt.pdf` - Download receipt

5. **Dashboard & Analytics** (`/api/dashboard`)
   - `GET /api/dashboard/stats` - Get dashboard statistics
   - `GET /api/policies/{id}/export.csv` - Export assignment data

### Database Models

- **Users**: Email-based user accounts with roles (admin/employee)
- **Policies**: Policy documents with versioning and SHA-256 hashing
- **Assignments**: Policy-to-user assignments with status tracking
- **Acknowledgments**: Acknowledgment records with audit data
- **AuthCodes**: Temporary authentication codes
- **EmailEvents**: Email delivery tracking

## Setup

### Prerequisites

- Python 3.10+
- PostgreSQL database
- Brevo account (for email)
- Backblaze B2 account (for file storage)

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key

# File Storage (Backblaze B2)
B2_KEYID=your_b2_key_id
B2_KEYNAME=your_b2_key_name
B2_APPLICATIONKEY=your_b2_application_key
B2_BUCKET_NAME=your_bucket_name

# JWT
JWT_SECRET=your_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7
MAGIC_LINK_EXPIRE_DAYS=30

# App Configuration
ORG_NAME=Your Organization
SENDER_EMAIL=noreply@yourorg.com
SENDER_NAME=Your Organization Team
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
ENVIRONMENT=development
```

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
# or
poetry install
```

2. Run database migrations:
```bash
alembic upgrade head
```

3. Start the application:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

## Authentication Flow

1. User enters email address
2. System sends 6-digit code via email
3. User enters code to receive JWT token
4. JWT token used for authenticated API calls

## Policy Workflow

1. **Admin creates policy** (Markdown text and/or PDF file)
2. **Admin assigns users** to the policy
3. **System sends emails** with magic links to assigned users
4. **Users click magic links** to view and acknowledge policies
5. **System tracks acknowledgments** and generates audit trail
6. **Admins can send reminders** and export reports

## File Storage

- PDF files are uploaded to Backblaze B2
- File URLs are stored in the database
- SHA-256 hashes ensure file integrity

## Security Features

- JWT-based authentication
- Magic link tokens for acknowledgments
- SHA-256 content hashing
- IP address and User-Agent logging
- Audit trail for all actions

## Development

### Project Structure

```
app/
├── api/           # API endpoints
├── core/          # Core functionality
│   ├── config.py  # Configuration
│   ├── security.py # JWT & auth
│   ├── email.py   # Email integration
│   ├── storage.py # File storage
│   └── hashing.py # SHA-256 utilities
├── models/        # Database models
├── schemas/       # Pydantic schemas
└── main.py        # FastAPI app

alembic/           # Database migrations
```

### Running Tests

```bash
pytest
```

### Code Quality

```bash
black app/
flake8 app/
mypy app/
```

## Deployment

### Docker

```bash
docker build -t policy-tracker .
docker run -p 8000:8000 --env-file .env policy-tracker
```

### Environment-specific Configuration

- Development: Full logging, auto-reload, docs enabled
- Production: Minimal logging, docs disabled, security headers

## Monitoring

- Health check endpoint: `/health`
- Structured logging throughout the application
- Email delivery tracking via Brevo webhooks

## License

[Your License Here]