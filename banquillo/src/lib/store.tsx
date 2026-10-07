import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DB, Profile, Repo } from './types';
import { supabaseRepo } from './supabaseRepo';
import { demoRepo } from './demoRepo';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const repo: Repo = url && key ? supabaseRepo(url, key) : demoRepo();

const EMPTY: DB = { profiles: [], teams: [], players: [], competitions: [], entries: [], matches: [], match_players: [], inducements: [] };

type Ctx = {
  db: DB; me: Profile | null; loading: boolean; repo: Repo;
  /** Ejecuta un cambio, recarga los datos y muestra el aviso o el error. */
  run: (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;
  toast: (msg: string) => void;
  refresh: () => Promise<void>;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(C);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(EMPTY);
  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(x => (x === m ? null : x)), 2600); }, []);
  const refresh = useCallback(async () => {
    try {
      const [d, u] = await Promise.all([repo.load(), repo.currentUser()]);
      setDb(d); setMe(u);
    } catch (e) { toast((e as Error).message); }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    refresh();
    const a = repo.onAuthChange(refresh);
    const b = repo.subscribe(refresh);
    return () => { a(); b(); };
  }, [refresh]);

  const run = useCallback(async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); await refresh(); if (ok) toast(ok); return true; }
    catch (e) { toast((e as Error).message); return false; }
  }, [refresh, toast]);

  const value = useMemo(() => ({ db, me, loading, repo, run, toast, refresh }), [db, me, loading, run, toast, refresh]);
  return <C.Provider value={value}>{children}{msg && <div className="toast" role="status">{msg}</div>}</C.Provider>;
}
