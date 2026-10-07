-- Banquillo: acta con los dos equipos y lesiones sufridas (BB2025).
-- Pégalo en Supabase > SQL Editor y pulsa Run, después de bb2025.sql. Se puede repetir sin problema.

alter table public.match_players add column if not exists injury text not null default 'none'
  check (injury in ('none', 'bh', 'sh', 'si', 'li', 'dead'));
alter table public.match_players add column if not exists injury_stat text
  check (injury_stat is null or injury_stat in ('MA', 'ST', 'AG', 'PA', 'AV'));

-- El acta la rellenan los dos entrenadores del partido o la organización, para los jugadores de cualquiera de los dos equipos.
create or replace function public.reports_match(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches x where x.id = m
    and (public.organizes(x.competition_id) or public.owns_team(x.home) or public.owns_team(x.away)))
$$;

drop policy if exists "apuntar experiencia" on public.match_players;
drop policy if exists "corregir experiencia" on public.match_players;
drop policy if exists "borrar experiencia" on public.match_players;
create policy "apuntar experiencia" on public.match_players for insert to authenticated
  with check (public.reports_match(match_id) and public.plays_match(match_id, team_id) and public.player_in_team(player_id, team_id));
create policy "corregir experiencia" on public.match_players for update to authenticated
  using (public.reports_match(match_id))
  with check (public.reports_match(match_id) and public.plays_match(match_id, team_id) and public.player_in_team(player_id, team_id));
create policy "borrar experiencia" on public.match_players for delete to authenticated using (public.reports_match(match_id));

-- Las lesiones del acta cambian el estado del jugador: muerto, o se pierde el próximo partido.
-- Si se corrige o se borra el acta, se deshace lo que había aplicado.
create or replace function public.injury_status(i text) returns text
language sql immutable as $$
  select case when i = 'dead' then 'dead' when i in ('sh', 'si', 'li') then 'mng' else null end
$$;
create or replace function public.apply_injury() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and public.injury_status(old.injury) is not null then
    update players set status = 'ok' where id = old.player_id and status = public.injury_status(old.injury);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and public.injury_status(new.injury) is not null then
    update players set status = public.injury_status(new.injury) where id = new.player_id;
  end if;
  return null;
end $$;
drop trigger if exists match_players_injury on public.match_players;
create trigger match_players_injury after insert or update or delete on public.match_players
  for each row execute function public.apply_injury();
