-- Coach publishing support for the standalone The-coach repository.
-- Sessions remain owned by the athlete. A coach may publish only when that
-- athlete is present in one of the coach's teams.

alter table public.assigned_session
  add column if not exists coach_session_key text;

create unique index if not exists assigned_session_athlete_coach_key
  on public.assigned_session (athlete_id, coach_session_key)
  where coach_session_key is not null;

create or replace function public.coaches_athlete_anywhere(target_athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_athlete ta
    join public.team t on t.id = ta.team_id
    where ta.athlete_id = target_athlete
      and t.coach_id = auth.uid()
  );
$$;

revoke all on function public.coaches_athlete_anywhere(uuid) from public;
grant execute on function public.coaches_athlete_anywhere(uuid) to authenticated;

alter table public.assigned_session enable row level security;

drop policy if exists assigned_session_coach_insert on public.assigned_session;
create policy assigned_session_coach_insert
on public.assigned_session
for insert
to authenticated
with check (
  public.coaches_athlete_anywhere(athlete_id)
  and state in ('published', 'unpublished')
);

drop policy if exists assigned_session_coach_update on public.assigned_session;
create policy assigned_session_coach_update
on public.assigned_session
for update
to authenticated
using (public.coaches_athlete_anywhere(athlete_id))
with check (
  public.coaches_athlete_anywhere(athlete_id)
  and state in ('published', 'unpublished', 'completed')
);

drop policy if exists assigned_session_athlete_read on public.assigned_session;
create policy assigned_session_athlete_read
on public.assigned_session
for select
to authenticated
using (
  athlete_id = auth.uid()
  or public.coaches_athlete_anywhere(athlete_id)
);
