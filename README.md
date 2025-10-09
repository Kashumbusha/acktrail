# Policy Acknowledgment Tracker

A complete policy acknowledgment tracking system where admins upload policies, send them to employees via magic links, and track acknowledgments - all without passwords.

## Features

### Authentication
- Magic link authentication via 6-digit email codes
- No passwords required
- JWT token management with 7-day expiration
- Auto-creates users on first login

### Policy Management
- Create policies with PDF upload or Markdown text
- SHA-256 content hashing for tamper detection
- Version tracking
- Due date management
- Require typed signatures option

### Assignment & Tracking
- Bulk recipient management (CSV or email list)
- Magic link generation (30-day expiration)
- Real-time status tracking (pending, viewed, acknowledged)
- Reminder system (max 3 reminders with escalating urgency)
- IP address and user agent logging

### Dashboard & Analytics
- Comprehensive statistics overview
- Assignment progress tracking
- CSV export functionality
- PDF receipt generation
- Recent activity monitoring

### Email Integration
- Brevo API for transactional emails
- Professional HTML email templates
- Authentication codes
- Policy assignment notifications
- Escalating reminder emails

### File Storage
- Backblaze B2 integration for PDF storage
- Secure file URL generation
- Content hashing for integrity

## Tech Stack

### Backend
- Python FastAPI
- PostgreSQL (Supabase hosted)
- SQLAlchemy ORM
- Alembic migrations
- JWT authentication
- Brevo email service
- Backblaze B2 storage

### Frontend
- React with Vite
- TailwindCSS
- React Router v6
- React Query
- React PDF viewer
- HeadlessUI components
- Heroicons

## Setup

### Prerequisites
- Python 3.10+
- Node.js 20.19+ or 22.12+
- PostgreSQL database
- Brevo account for emails
- Backblaze B2 account for file storage

### Backend Setup

1. Install dependencies:
```bash
cd backend
pip install poetry
poetry install
```

2. Configure environment variables in `backend/.env`:
```bash
# Already configured with your credentials
DATABASE_URL=postgresql://...
BREVO_API_KEY=...
B2_KEYID=...
B2_APPLICATIONKEY=...
JWT_SECRET=...
```

3. Run database migrations:
```bash
poetry run alembic upgrade head
```

4. Start the backend server:
```bash
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API is now running at http://localhost:8000
API documentation available at http://localhost:8000/docs

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend is now running at http://localhost:5173

## API Endpoints

### Authentication
- `POST /api/auth/send-code` - Send 6-digit code via email
- `POST /api/auth/verify-code` - Verify code and get JWT
- `GET /api/auth/me` - Get current user

### Policies
- `GET /api/policies` - List all policies
- `POST /api/policies` - Create new policy
- `GET /api/policies/{id}` - Get specific policy
- `PUT /api/policies/{id}` - Update policy
- `DELETE /api/policies/{id}` - Delete policy

### Assignments
- `POST /api/policies/{id}/recipients` - Add recipients
- `POST /api/policies/{id}/send` - Send assignments
- `GET /api/policies/{id}/assignments` - List assignments
- `POST /api/assignments/{id}/remind` - Send reminder
- `POST /api/policies/{id}/remind-all` - Send bulk reminders

### Acknowledgments
- `GET /api/ack/{token}` - Get acknowledgment page data
- `POST /api/ack/{token}` - Submit acknowledgment
- `GET /api/ack/assignment/{id}/receipt.pdf` - Download receipt

### Dashboard
- `GET /api/dashboard/stats` - Get statistics
- `GET /api/policies/{id}/export.csv` - Export assignments

## Usage

### Admin Flow
1. Login with email (receive 6-digit code)
2. Create a policy (upload PDF or write Markdown)
3. Add recipients (CSV upload or paste emails)
4. Send acknowledgment requests
5. Monitor progress on dashboard
6. Send reminders as needed
7. Export data to CSV

### Employee Flow
1. Receive email with magic link
2. Click link to view policy (no login required)
3. Review policy content
4. Acknowledge with checkbox or typed signature
5. Download receipt PDF

## Security Features

- JWT token authentication
- Magic link tokens with expiration
- SHA-256 content hashing
- Rate limiting (3 attempts for auth codes)
- IP address and user agent logging
- Single-use acknowledgment tokens
- Secure file storage with Backblaze B2

## Current Status

✅ Backend fully implemented and running at http://localhost:8000
✅ Frontend fully implemented
✅ Database models and migrations created
✅ Authentication system with magic links working
✅ Email integration with Brevo configured and tested
✅ File storage with Backblaze B2 ready
✅ All API endpoints implemented
✅ Comprehensive error handling
✅ Production-ready code

## Note

To run the frontend, ensure Node.js is upgraded to v20.19+ or v22.12+ as Vite requires these versions.

## License

Private - All rights reserved