# Fix Staff Count Sync for Existing Workspaces

## Problem
Existing workspaces have incorrect `active_staff_count` values because this field was never initialized during workspace creation. This causes:
- Dashboard showing "0 employees" despite having active staff
- Settings showing "In use: 0" incorrectly
- Billing showing "0 × $5/month" instead of actual staff count

## Solution
Run the sync script to correct all existing workspace data.

---

## Option 1: Run via Railway CLI (Recommended)

```bash
# From your local machine with Railway CLI installed
cd backend
railway run python sync_staff_counts.py
```

---

## Option 2: Run via Railway Web Terminal

1. Go to your Railway dashboard
2. Select your backend service
3. Click on "Deploy" tab
4. Click "View Logs" and find the "Terminal" tab
5. Run:
```bash
cd /app
python sync_staff_counts.py
```

---

## Option 3: Run via API Endpoint

After deploying the backend code, you can use the new API endpoint:

```bash
# Using curl (replace TOKEN and URL)
curl -X POST https://your-backend-url.railway.app/api/users/sync-all-workspaces \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

Or using the browser console on your frontend:
```javascript
fetch('https://your-backend-url.railway.app/api/users/sync-all-workspaces', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log)
```

---

## Option 4: Run Locally (Development)

```bash
cd backend

# Activate your virtual environment
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Set your database URL
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Run the sync script
python sync_staff_counts.py
```

---

## Expected Output

```
INFO:__main__:Found 3 workspaces to sync
INFO:__main__:Workspace 'Acme Corp': None -> 2 active staff
INFO:__main__:  - Acme Corp: Licensed=5, Active=2, Admins=1
INFO:__main__:Workspace 'Tech Startup': None -> 0 active staff
INFO:__main__:  - Tech Startup: Licensed=1, Active=0, Admins=1
INFO:__main__:Workspace 'Enterprise Co': None -> 15 active staff
INFO:__main__:  - Enterprise Co: Licensed=20, Active=15, Admins=3

✅ Successfully synced 3/3 workspaces
```

---

## Verification

After running the sync, verify the fix:

1. **Dashboard**: Check "Employee Seats" shows correct "In use" count
2. **Settings > Profile**: Check "Employee Seats (Billable)" shows correct "In use"
3. **Settings > Subscription & Billing**: Check "Staff Members" shows correct count

---

## Notes

- ✅ Safe to run multiple times (idempotent)
- ✅ Only counts active employees (role=employee, is_guest=false, active=true)
- ✅ Admins are excluded from seat counts
- ✅ Guest users are excluded from billable seats
- ⚠️ Requires database connection (uses DATABASE_URL env var)

---

## For Future Deployments

This fix is now baked into the code:
- New workspaces automatically initialize `active_staff_count`
- User invitations automatically update the count
- The sync endpoint is available at `/api/users/sync-staff-count` (current workspace) or `/api/users/sync-all-workspaces` (all workspaces)
