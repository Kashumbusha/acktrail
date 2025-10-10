-- Policy Ack Tracker - Supabase PostgreSQL schema
-- Run this in Supabase SQL editor

create extension if not exists "uuid-ossp";

-- users
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text,
  role text not null default 'employee', -- 'admin' | 'employee'
  department text,
  created_at timestamptz not null default now()
);

-- policies
create table if not exists public.policies (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body_markdown text,
  file_url text,
  content_sha256 text not null,
  version int not null default 1,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  due_at timestamptz,
  require_typed_signature boolean not null default false
);

-- assignments
create table if not exists public.assignments (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending', -- pending | viewed | acknowledged | declined
  viewed_at timestamptz,
  acknowledged_at timestamptz,
  reminder_count int not null default 0,
  created_at timestamptz not null default now(),
  unique(policy_id, user_id)
);

-- acknowledgments
create table if not exists public.acknowledgments (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  signer_name text,
  signer_email text,
  ip_address text,
  user_agent text,
  policy_version int not null,
  policy_hash_at_ack text not null,
  ack_method text not null, -- typed | oneclick
  created_at timestamptz not null default now()
);

-- email events
create table if not exists public.email_events (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  type text not null, -- send | open | bounce
  provider_message_id text,
  created_at timestamptz not null default now()
);

-- indexes
create index if not exists idx_assignments_policy on public.assignments(policy_id);
create index if not exists idx_assignments_user on public.assignments(user_id);
create index if not exists idx_email_events_assignment on public.email_events(assignment_id);






