-- Banquillo: esquema de base de datos y permisos para Supabase.
-- Pégalo entero en Supabase > SQL Editor y pulsa Run. Se puede ejecutar una sola vez sobre un proyecto vacío.
--
-- Reglas de permisos:
--   * Cualquiera (incluso sin cuenta) puede ver competiciones, equipos, plantillas y resultados.
--   * Cada entrenador solo modifica sus propios equipos y jugadores.
--   * Quien crea una competición la organiza: cambia reglas, da comienzo, empareja rondas y la cierra.
--   * Un entrenador inscribe sus equipos mientras la inscripción está abierta.
--   * El resultado de un partido lo puede meter la organización o cualquiera de los dos entrenadores.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Entrenador' check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  race text not null,
  hue int not null default 120,
  treasury int not null default 1000,
  rerolls int not null default 0 check (rerolls >= 0),
  apothecary boolean not null default false,
  fans int not null default 1,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams on delete cascade,
  num int not null default 1,
  name text not null check (char_length(name) between 1 and 80),
  pos text not null default 'Línea',
  spp int not null default 0,
  value int not null default 50,
  status text not null default 'ok' check (status in ('ok', 'mng', 'dead'))
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  organizer uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type text not null check (type in ('liga', 'torneo')),
  double_round boolean not null default false,
  total_rounds int not null default 5 check (total_rounds between 1 and 30),
  pts_w int not null default 3,
  pts_d int not null default 1,
  pts_l int not null default 0,
  status text not null default 'open' check (status in ('open', 'running', 'finished')),
  created_at timestamptz not null default now()
);

create table public.entries (
  competition_id uuid not null references public.competitions on delete cascade,
  team_id uuid not null references public.teams on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (competition_id, team_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions on delete cascade,
  round int not null check (round >= 1),
  home uuid not null references public.teams on delete restrict,
  away uuid references public.teams on delete restrict,
  td_home int not null default 0 check (td_home >= 0),
  td_away int not null default 0 check (td_away >= 0),
  cas_home int not null default 0 check (cas_home >= 0),
  cas_away int not null default 0 check (cas_away >= 0),
  played boolean not null default false,
  reported_by uuid references public.profiles on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.players (team_id);
create index on public.matches (competition_id);

-- Funciones de ayuda para las políticas
create or replace function public.owns_team(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from teams where id = t and owner = auth.uid())
$$;
create or replace function public.organizes(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from competitions where id = c and organizer = auth.uid())
$$;
create or replace function public.comp_open(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from competitions where id = c and status = 'open')
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.competitions enable row level security;
alter table public.entries enable row level security;
alter table public.matches enable row level security;

-- Lectura pública
create policy "lectura" on public.profiles for select to anon, authenticated using (true);
create policy "lectura" on public.teams for select to anon, authenticated using (true);
create policy "lectura" on public.players for select to anon, authenticated using (true);
create policy "lectura" on public.competitions for select to anon, authenticated using (true);
create policy "lectura" on public.entries for select to anon, authenticated using (true);
create policy "lectura" on public.matches for select to anon, authenticated using (true);

-- Perfil propio
create policy "editar mi perfil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Equipos y jugadores: solo su entrenador
create policy "crear mi equipo" on public.teams for insert to authenticated with check (owner = auth.uid());
create policy "editar mi equipo" on public.teams for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "borrar mi equipo" on public.teams for delete to authenticated using (owner = auth.uid());
create policy "crear jugador" on public.players for insert to authenticated with check (public.owns_team(team_id));
create policy "editar jugador" on public.players for update to authenticated using (public.owns_team(team_id)) with check (public.owns_team(team_id));
create policy "borrar jugador" on public.players for delete to authenticated using (public.owns_team(team_id));

-- Competiciones: quien la crea la organiza
create policy "crear competición" on public.competitions for insert to authenticated with check (organizer = auth.uid());
create policy "editar competición" on public.competitions for update to authenticated using (organizer = auth.uid()) with check (organizer = auth.uid());
create policy "borrar competición" on public.competitions for delete to authenticated using (organizer = auth.uid());

-- Inscripciones
create policy "inscribir" on public.entries for insert to authenticated
  with check ((public.owns_team(team_id) and public.comp_open(competition_id)) or public.organizes(competition_id));
create policy "retirar" on public.entries for delete to authenticated
  using ((public.owns_team(team_id) and public.comp_open(competition_id)) or public.organizes(competition_id));

-- Partidos: la organización crea y borra el calendario; resultados la organización o los dos equipos
create policy "crear partidos" on public.matches for insert to authenticated with check (public.organizes(competition_id));
create policy "borrar partidos" on public.matches for delete to authenticated using (public.organizes(competition_id));
create policy "meter resultado" on public.matches for update to authenticated
  using (public.organizes(competition_id) or public.owns_team(home) or public.owns_team(away))
  with check (public.organizes(competition_id) or public.owns_team(home) or public.owns_team(away));

-- Un entrenador solo puede tocar el marcador, no cambiar quién juega
create or replace function public.lock_match_teams() returns trigger
language plpgsql as $$
begin
  if not public.organizes(old.competition_id)
     and (new.home is distinct from old.home or new.away is distinct from old.away
          or new.round is distinct from old.round or new.competition_id is distinct from old.competition_id) then
    raise exception 'Solo la organización puede cambiar los emparejamientos';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger matches_lock before update on public.matches
  for each row execute function public.lock_match_teams();

-- Actualizaciones en directo para todos los que tengan la app abierta
alter publication supabase_realtime add table public.profiles, public.teams, public.players,
  public.competitions, public.entries, public.matches;
