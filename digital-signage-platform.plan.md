<!-- e8887792-5f31-44c0-8924-61f7a914731e 6702f4f6-d5af-4f30-833e-1a80c7c59ba0 -->
# Policy Ack Tracker - Core Web App

## Overview

A policy acknowledgment tracking system where admins upload policies (PDF/Markdown), send them to employees via email with magic links, and track who has acknowledged. No passwords - everyone uses magic link authentication via email codes.

## Technology Stack

**Backend:**

- Python FastAPI
- Supabase PostgreSQL (hosted, using existing credentials)
- SQLAlchemy + psycopg2 for DB connection
- Alembic for migrations (optional with Supabase)
- Backblaze B2 for PDF storage (using existing credentials)
- Brevo (formerly Sendinblue) for transactional emails (using existing API key)
- PyJWT for magic link tokens
- hashlib for SHA-256 content hashing

**Frontend:**

- React + Vite
- TailwindCSS
- React Router
- React Query
- React PDF viewer for policy display

**Infrastructure:**

- Supabase hosted PostgreSQL (no local Docker needed)
- Backblaze B2 for file storage
- Poetry for Python dependencies
- Environment variables from `.b2kesys.env`

## Database Schema

```sql
users
  id (uuid), email (unique), name, role (admin/employee), 
  department, created_at

policies
  id (uuid), title, body_markdown (nullable), file_url (nullable),
  content_sha256, version (int), created_by (user_id),
  created_at, due_at (nullable), require_typed_signature (bool)

assignments (policy → recipient)
  id (uuid), policy_id, user_id, 
  status (pending|viewed|acknowledged|declined),
  viewed_at (nullable), acknowledged_at (nullable), 
  reminder_count (int default 0)

acknowledgments
  id (uuid), assignment_id, signer_name, signer_email, 
  ip_address, user_agent, policy_version, policy_hash_at_ack,
  ack_method (typed|oneclick), created_at

email_events
  id (uuid), assignment_id, type (send|open|bounce),
  provider_message_id, created_at
```

## Core Features & Implementation

### 1. Magic Link Authentication (No Passwords)

**For everyone (admin + employee):**

- Enter email → receive 6-digit code via email
- Enter code → get JWT token → access granted
- JWT stores: user_id, email, role, exp (7 days)
- Frontend stores JWT in localStorage

**For employee acknowledgments:**

- Separate magic link in email: `/ack/:token`
- Token is signed JWT with: assignment_id, user_email, policy_id, exp (30 days)
- No login required - direct access to specific policy

### 2. Admin Flow

**A. Create Policy**

- Upload PDF to S3 OR paste Markdown
- Compute SHA-256 hash of content (tamper-evidence)
- Set: title, due date (optional), require typed signature (checkbox)
- Save as Policy v1.0

**B. Add Recipients**

- UI: Paste emails (comma/newline separated) OR upload CSV (name, email, department)
- System creates/updates user records (role=employee)
- Creates Assignment rows (policy_id + user_id, status=pending)

**C. Send Acknowledgment Requests**

- For each assignment: generate magic link `/ack/:token`
- Send email via Resend/SendGrid:
  - Subject: "Action needed: {Policy Title} - acknowledge by {Due Date}"
  - Body: personalized greeting, policy summary, magic link button
  - Track email_event (type=send)
- Magic link valid for 30 days

**D. Dashboard**

- Policy list: title, version, due date, progress bar (% acknowledged)
- Policy detail page:
  - Status chips: Pending (gray), Viewed (blue), Acknowledged (green), Overdue (red)
  - Table: employee name, email, department, status, viewed_at, ack_at
  - Search/filter by status, department
  - Bulk actions: Send Reminder, Export CSV
- Analytics: total policies, total assignments, completion rate

**E. Reminders**

- Button: "Send Reminder" (to all pending/viewed non-acknowledgers)
- Generates new email with subject: "Reminder: {Policy Title}"
- Increments assignment.reminder_count
- Rate limit: max 3 reminders per assignment

**F. Export**

- CSV with columns:
  - policy_title, policy_version, policy_hash, due_at
  - employee_name, employee_email, department
  - status, viewed_at, acknowledged_at
  - ack_method, ack_ip, ack_user_agent
  - last_email_sent_at, reminder_count

**G. Receipt PDF**

- Per-acknowledgment receipt (downloadable)
- Shows: policy title, version, hash, employee name, ack timestamp, IP, signature method
- Generate using ReportLab or html2pdf

### 3. Employee Flow

**A. Receive Email**

- Email with personalized greeting and magic link
- Click link → opens `/ack/:token` page (no login required)

**B. Acknowledgment Page**

- Verify token → fetch assignment + policy
- Display policy content:
  - If PDF: embedded PDF viewer (react-pdf)
  - If Markdown: rendered HTML
- Scrollable viewer with summary bullets at top
- Track "viewed_at" on page load (update assignment status)

**C. Acknowledge**

- Checkbox: "I have read and agree to this policy"
- If require_typed_signature: text input for full name
- If one-click: name pre-filled from user record
- Button: "Acknowledge"
- On submit:
  - Capture: IP, user agent, timestamp
  - Create acknowledgment record with policy hash
  - Update assignment status → acknowledged
  - Show success screen

**D. Success Screen**

- "Acknowledged on 2025-10-09 at 14:22 UTC"
- Download receipt button (PDF)
- Token now single-use (expired)

### 4. Email Templates

**Initial Request:**

```
Subject: Action needed: {Policy Title} — acknowledge by {Due Date}

Hi {FirstName},

{OrgName} has published a new policy: {Policy Title}.

Please review and acknowledge by {DueDate}.

[Review & Acknowledge] (button/link)

This link is unique to you. Questions? Reply to this email.

— {OrgName} Compliance Team
```

**Reminder:**

```
Subject: Reminder: {Policy Title} — action needed

Hi {FirstName},

You haven't yet acknowledged: {Policy Title}.

Due date: {DueDate}

[Review & Acknowledge] (button/link)

— {OrgName} Compliance Team
```

## Key API Endpoints

```
Auth:
POST /api/auth/send-code (email → 6-digit code)
POST /api/auth/verify-code (email + code → JWT)
GET /api/auth/me (verify JWT)

Admin - Policies:
GET /api/policies (list all)
POST /api/policies (create: upload file or markdown)
GET /api/policies/{id}
PUT /api/policies/{id}
DELETE /api/policies/{id}

Admin - Assignments:
POST /api/policies/{id}/recipients (CSV or email list)
POST /api/policies/{id}/send (generate + send magic links)
GET /api/policies/{id}/assignments (list with filters)
POST /api/assignments/{id}/remind (send reminder)
GET /api/policies/{id}/export.csv

Employee - Acknowledgment:
GET /api/ack/{token} (verify token, get policy + assignment)
POST /api/ack/{token} (submit acknowledgment)
GET /api/ack/{assignment_id}/receipt.pdf

Admin - Analytics:
GET /api/dashboard/stats
```

## Implementation Phases

### Phase 1: Foundation

- Project structure (backend, frontend, docker-compose.yml)
- PostgreSQL + SQLAlchemy models + Alembic
- FastAPI app with CORS
- Email service integration (Resend/SendGrid)
- AWS S3 client setup

### Phase 2: Authentication

- Magic link auth for admins/employees (6-digit code)
- JWT token generation and verification
- Auth endpoints (send-code, verify-code, me)
- React auth context + protected routes
- Login page with email input

### Phase 3: Admin - Policy Creation

- Policy creation endpoint (upload PDF or markdown)
- SHA-256 hash computation
- File upload to S3
- Policy list page (React)
- Policy create modal/page with upload UI
- Markdown editor (simple textarea)

### Phase 4: Admin - Recipients & Assignments

- Recipient management (CSV upload or paste emails)
- Create/update user records
- Create assignments
- Recipients UI (paste emails or upload CSV)
- Assignment creation confirmation

### Phase 5: Email & Magic Links

- Generate assignment magic link tokens
- Email template rendering
- Send acknowledgment request emails
- Track email events
- Test email delivery

### Phase 6: Employee Acknowledgment

- Token verification endpoint
- Acknowledgment page (`/ack/:token`)
- PDF viewer (react-pdf) + Markdown renderer
- Track "viewed_at" on page load
- Acknowledge form (checkbox + signature input)
- Submit acknowledgment endpoint
- Capture IP, user agent, timestamp
- Success screen

### Phase 7: Admin Dashboard

- Policy detail page with assignment table
- Status filters (pending, viewed, acknowledged, overdue)
- Search by employee name/email
- Progress indicators (% acknowledged)
- Real-time updates (optional)

### Phase 8: Reminders & Export

- Send reminder functionality
- Rate limiting (max 3 reminders)
- CSV export with all audit data
- Receipt PDF generation
- Download receipt endpoint

### Phase 9: Polish & Launch

- Error handling throughout
- Loading states and spinners
- Responsive design (mobile-friendly)
- Email preview before send
- Due date highlighting (overdue in red)
- README with setup instructions
- Environment variable docs

## File Structure

```
/backend
  /app
    /api
      auth.py (magic link auth)
      policies.py (CRUD)
      assignments.py (recipients, send, remind)
      acknowledgments.py (employee ack)
      dashboard.py (stats)
    /models
      database.py (SQLAlchemy models)
    /core
      config.py (env vars)
      security.py (JWT)
      email.py (Resend/SendGrid)
      s3.py (AWS S3)
      hashing.py (SHA-256)
    /schemas
      *.py (Pydantic models)
    main.py
  /alembic
  pyproject.toml
  .env.example

/frontend
  /src
    /components
      PolicyViewer.jsx (PDF/MD renderer)
      AcknowledgeForm.jsx
      AssignmentTable.jsx
    /pages
      Login.jsx
      Dashboard.jsx
      PolicyList.jsx
      PolicyCreate.jsx
      PolicyDetail.jsx
      AcknowledgePage.jsx (public)
      SuccessPage.jsx
    /hooks
      useAuth.js
    /api
      client.js (axios with JWT)
    /store
      authStore.js (Zustand)
    App.jsx
  package.json
  vite.config.js

docker-compose.yml
README.md
```

## Security & Integrity

- Magic link tokens: JWT signed with server secret, 30-day expiry
- Admin login: 6-digit code valid for 10 minutes
- Store SHA-256 hash to detect policy tampering
- Single-use acknowledgment (token expires after ack)
- Rate limit: email sends, reminder sends
- IP & user agent captured for audit trail
- HTTPS required in production

## Configuration for Initial Setup

**Environment Variables (`.env`):**

```
# From existing .b2kesys.env
B2_KEYID=00333532bbe68080000000001
B2_KEYNAME=key1
B2_APPLICATIONKEY=K003+Egjnb21fb72VVmXSgN2jDmBM+Q
BREVO_API_KEY=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
SUPABASE_PROJECT_URL=https://rkqpolvrimjjsblbunzh.supabase.co
SUPABASE_PROJECT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Generated for local dev
JWT_SECRET=<generated-random-secret>
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7

# App config
ORG_NAME=kashustephen
SENDER_EMAIL=kashustephen@gmail.com (or your verified Brevo email)
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
```

**Development Setup:**

- Backend runs on `localhost:8000`
- Frontend runs on `localhost:5173` (Vite default)
- Supabase PostgreSQL (remote, using credentials)
- Backblaze B2 (remote, using credentials)
- Brevo email (remote, using API key)

**Next Steps:**

1. Generate JWT secret during setup
2. Connect to Supabase and create tables
3. Configure Brevo sender email
4. Test email delivery
5. Build and test locally
6. Deploy to production later

## Future Enhancements (Phase 2)

- Multi-policy campaigns (send 5 policies at once)
- Quiz questions before acknowledgment
- Department-based auto-assignment
- Manager view (see team compliance)
- Webhook notifications
- Custom branding (logo, colors)
- Advanced analytics dashboard
- Policy versioning (bump version on edit)

### To-dos

- [ ] Initialize project structure with backend, frontend, and player directories
- [ ] Set up backend API with authentication, database schema, and core endpoints
- [ ] Create admin dashboard with React/Next.js and basic routing
- [ ] Implement user authentication and organization management
- [ ] Build content upload, storage, and library management system
- [ ] Implement screen registration, pairing, and management features
- [ ] Create playlist builder with drag-and-drop interface
- [ ] Build scheduling system with calendar integration
- [ ] Develop web-based player application for displays
- [ ] Implement WebSocket connections for real-time screen updates
- [ ] Add analytics tracking and monitoring dashboard
- [ ] Write tests and documentation for the platform