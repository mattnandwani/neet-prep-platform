-- Store student baseline and syllabus progress for the dynamic NEET workload planner.
alter table public.profiles
  add column if not exists baseline_score integer not null default 0
    check (baseline_score between 0 and 720),
  add column if not exists syllabus_completion_percent integer not null default 0
    check (syllabus_completion_percent between 0 and 100);
