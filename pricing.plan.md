<!-- e7c5502b-e8dc-48c0-baaf-40497ce479f5 7ba411b8-4ec7-4052-a8fe-1ba1fe4fa8c1 -->
# Pricing, Teams, and User Management

## Scope

- Public Pricing page with corporate-focused tiers and CTAs.
- Workspace multitenancy: signup creates a Workspace; migrate existing data to "Default Workspace". Policies/assignments are scoped to workspace, with optional Teams for categorization inside a workspace.
- Admin User Management: staff vs guests, invites, roles, per-user history.
- Signup collects team name; first user becomes team admin. Login/Signup pages get header/footer and richer content.

## Pricing (USD)

- Small Business: $49/mo base + $5/staff
- Limits: up to 10 staff, 5 guest invites/mo, 1 admin.
- Medium: $149/mo base + $1/staff
- Limits: 11–49 staff, 50 guest invites/mo, 2 admins.
- Large: $299/mo base + $2/staff
- Limits: 50–100 staff, 100 guest invites/mo, 5 admins.
- Add-on: SSO $199 one-time.

## Backend

1) Data model (alembic migration)

- Add `teams` table: id, name, slug, plan (small|medium|large), created_at.
- Add columns: `users.team_id` (FK), `users.can_login` (bool, default true), `users.active` (bool, default true), `users.is_guest` (bool, default false).
- Add `policies.team_id` (FK) and `assignments.team_id` (FK).
- Migration data step: create one row `Default Team`; set all existing users, policies, and assignments to that team.

2) Auth and security

- Update JWT to include `team_id` claim (from user.team_id).
- Enforce `can_login` on verify; guests (can_login=false) cannot sign in.
- Keep global `User.role` for now (admin/employee); first user of newly created team is `admin`.

3) Team endpoints (new `backend/app/api/teams.py`)

- POST `/teams/register`: {team_name, email} → create team, create or attach user as admin, send auth code (reuse existing send-code), return ok.
- GET `/teams/me`: current team summary and plan.

4) User admin endpoints (new `backend/app/api/users.py`)

- GET `/users` (admin): filter `type=staff|guests`, search, paginate; scoped by `current_user.team_id`.
- POST `/users/invite` (admin): {email, name, role, can_login=true/false, is_guest} → create team user.
- PATCH `/users/{id}` (admin): update name, role, can_login, active.
- GET `/users/{id}/assignments` (admin): list assignments for the user (with policy title/status/dates).

5) Team scoping adjustments

- In `policies.py` and `assignments.py`, ensure all queries and creations set/filter by `team_id`.
- On policy create, set `team_id = current_user.team_id`.

## Frontend

1) Pricing page

- New `frontend/src/pages/Pricing.jsx`: tier cards, limits, feature comparison, FAQs, CTAs (Sign up with team name).
- Add `/pricing` route in `App.jsx`; add link in `Landing.jsx` nav.

2) Signup flow (collect team name)

- Update `frontend/src/pages/Signup.jsx` to add Team Name step (team name + email) and call new POST `/teams/register`, then move to code verification step.
- Add header/footer to Login/Signup using the landing nav/footer components.

3) Admin User Management

- New `frontend/src/pages/AdminUsers.jsx` accessible to admins via `PrivateRoute`.
- UI: tabs "Staff" and "Guests"; searchable paginated table; actions: Invite, Toggle Can Login, Make Admin, Deactivate; drawer to show assignment history (fetch `/users/{id}/assignments`).
- Components under `frontend/src/components/users/`: `UserTable.jsx`, `InviteUserModal.jsx`, `UserHistoryDrawer.jsx`.
- Add nav link to `Users` for admins in `components/Layout.jsx`.

## Limits and gating (MVP)

- Display plan limits in UI; soft-enforce in backend with simple checks on create/invite endpoints using counts.
- Defer billing to later; store chosen plan enum on team.

## Migration strategy

- Alembic script: create `Default Team`, attach all existing users/policies/assignments; set `can_login=true` for existing users; `is_guest=false`.
- Backfill JWT issuance to include team_id immediately after migration.

## Risks/Notes

- Keeping global `User.role` is simplest now; future: per-team roles via a `team_members` table if needed.
- Guest users belong to the team for scoping but have `can_login=false`.

### To-dos

- [ ] Create teams model and migrate existing data to Default Team
- [ ] Add team_id to JWT and enforce can_login on verify
- [ ] Scope policies/assignments to team_id and set on create
- [ ] Add teams register endpoint to create team + first admin
- [ ] Add admin users endpoints: list/invite/update/history
- [ ] Create Pricing page and route, link from landing nav
- [ ] Add team name to signup, call /teams/register, add header/footer
- [ ] Build Admin Users page with tabs, invite modal, history drawer
- [ ] Add Users link for admins in Layout