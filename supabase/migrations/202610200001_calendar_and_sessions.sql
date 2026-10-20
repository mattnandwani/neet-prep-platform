-- Weekly study calendar, explicit study sessions, and test-attempt records.
alter table public.profiles
  add column if not exists study_timezone text not null default 'Asia/Kolkata',
  add column if not exists weekly_schedule jsonb not null default '[
    {"day":"Monday","enabled":true,"start":"19:00","end":"22:00"},
    {"day":"Tuesday","enabled":true,"start":"19:00","end":"22:00"},
    {"day":"Wednesday","enabled":true,"start":"19:00","end":"22:00"},
    {"day":"Thursday","enabled":true,"start":"19:00","end":"22:00"},
    {"day":"Friday","enabled":true,"start":"19:00","end":"22:00"},
    {"day":"Saturday","enabled":false,"start":"09:00","end":"12:00"},
    {"day":"Sunday","enabled":false,"start":"09:00","end":"12:00"}
  ]'::jsonb;

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_type text not null default 'Focused study',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_started_idx
  on public.study_sessions (user_id, started_at desc);

alter table public.study_sessions enable row level security;
drop policy if exists "Users can read own study sessions" on public.study_sessions;
create policy "Users can read own study sessions"
  on public.study_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own study sessions" on public.study_sessions;
create policy "Users can create own study sessions"
  on public.study_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own study sessions" on public.study_sessions;
create policy "Users can update own study sessions"
  on public.study_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_title text not null default 'Practice test',
  score integer not null check (score between 0 and 720),
  total_questions integer check (total_questions is null or total_questions >= 0),
  correct_answers integer check (correct_answers is null or correct_answers >= 0),
  incorrect_answers integer check (incorrect_answers is null or incorrect_answers >= 0),
  unanswered_questions integer check (unanswered_questions is null or unanswered_questions >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  average_response_seconds numeric(8,2),
  created_at timestamptz not null default now()
);

create index if not exists test_attempts_user_created_idx
  on public.test_attempts (user_id, created_at desc);

alter table public.test_attempts enable row level security;
drop policy if exists "Users can read own test attempts" on public.test_attempts;
create policy "Users can read own test attempts"
  on public.test_attempts for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own test attempts" on public.test_attempts;
create policy "Users can create own test attempts"
  on public.test_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);
