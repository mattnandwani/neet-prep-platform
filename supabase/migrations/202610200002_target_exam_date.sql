-- Add a specific intended NEET attempt date for dynamic planning.
alter table public.profiles
  add column if not exists target_exam_date date;
update public.profiles
set target_exam_date = make_date(coalesce(target_exam_year, 2030), 7, 1)
where target_exam_date is null;
