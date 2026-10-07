-- Banquillo: experiencia, avances, incentivos y después del partido de Blood Bowl 2025.
-- Si ya tenías la base de datos creada, pega esto en Supabase > SQL Editor y pulsa Run (se puede repetir sin problema).

alter table public.players add column if not exists advances jsonb not null default '[]'::jsonb;

-- Experiencia que gana cada jugador en cada partido
create table if not exists public.match_players (
  match_id uuid not null references public.matches on delete cascade,
  player_id uuid not null references public.players on delete cascade,
  team_id uuid not null references public.teams on delete cascade,
  td int not null default 0 check (td >= 0),
  cas int not null default 0 check (cas >= 0),
  cmp int not null default 0 check (cmp >= 0),
  inter int not null default 0 check (inter >= 0),
  ttm int not null default 0 check (ttm >= 0),
  mvp boolean not null default false,
  primary key (match_id, player_id)
);
create index if not exists match_players_team on public.match_players (team_id);

-- Incentivos que contrata cada equipo para un partido
create table if not exists public.inducements (
  match_id uuid not null references public.matches on delete cascade,
  team_id uuid not null references public.teams on delete cascade,
  pick jsonb not null default '{"items":{},"hires":[]}'::jsonb,
  treasury_spent int not null default 0 check (treasury_spent >= 0),
  primary key (match_id, team_id)
);

create or replace function public.plays_match(m uuid, t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = m and (home = t or away = t))
$$;
create or replace function public.player_in_team(p uuid, t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from players where id = p and team_id = t)
$$;

alter table public.match_players enable row level security;
alter table public.inducements enable row level security;

drop policy if exists "lectura" on public.match_players;
drop policy if exists "apuntar experiencia" on public.match_players;
drop policy if exists "corregir experiencia" on public.match_players;
drop policy if exists "borrar experiencia" on public.match_players;
create policy "lectura" on public.match_players for select to anon, authenticated using (true);
create policy "apuntar experiencia" on public.match_players for insert to authenticated
  with check (public.owns_team(team_id) and public.plays_match(match_id, team_id) and public.player_in_team(player_id, team_id));
create policy "corregir experiencia" on public.match_players for update to authenticated
  using (public.owns_team(team_id))
  with check (public.owns_team(team_id) and public.plays_match(match_id, team_id) and public.player_in_team(player_id, team_id));
create policy "borrar experiencia" on public.match_players for delete to authenticated using (public.owns_team(team_id));

drop policy if exists "lectura" on public.inducements;
drop policy if exists "contratar incentivos" on public.inducements;
drop policy if exists "cambiar incentivos" on public.inducements;
drop policy if exists "borrar incentivos" on public.inducements;
create policy "lectura" on public.inducements for select to anon, authenticated using (true);
create policy "contratar incentivos" on public.inducements for insert to authenticated
  with check (public.owns_team(team_id) and public.plays_match(match_id, team_id));
create policy "cambiar incentivos" on public.inducements for update to authenticated
  using (public.owns_team(team_id)) with check (public.owns_team(team_id) and public.plays_match(match_id, team_id));
create policy "borrar incentivos" on public.inducements for delete to authenticated using (public.owns_team(team_id));

do $$ begin
  alter publication supabase_realtime add table public.match_players, public.inducements;
exception when duplicate_object then null; end $$;

-- Secuencia de después del partido: ganancias, hinchas fieles y errores caros de cada equipo
create table if not exists public.postgame (
  match_id uuid not null references public.matches on delete cascade,
  team_id uuid not null references public.teams on delete cascade,
  fan_factor int not null default 0 check (fan_factor >= 0),
  no_stalling boolean not null default true,
  winnings int not null default 0,
  fans_before int not null default 1,
  fans_after int not null default 1,
  mistake text not null default 'none',
  mistake_loss int not null default 0 check (mistake_loss >= 0),
  primary key (match_id, team_id)
);
alter table public.postgame enable row level security;
drop policy if exists "lectura" on public.postgame;
drop policy if exists "cerrar partido" on public.postgame;
drop policy if exists "corregir cierre" on public.postgame;
drop policy if exists "borrar cierre" on public.postgame;
create policy "lectura" on public.postgame for select to anon, authenticated using (true);
create policy "cerrar partido" on public.postgame for insert to authenticated
  with check (public.owns_team(team_id) and public.plays_match(match_id, team_id));
create policy "corregir cierre" on public.postgame for update to authenticated
  using (public.owns_team(team_id)) with check (public.owns_team(team_id) and public.plays_match(match_id, team_id));
create policy "borrar cierre" on public.postgame for delete to authenticated using (public.owns_team(team_id));
do $$ begin
  alter publication supabase_realtime add table public.postgame;
exception when duplicate_object then null; end $$;
