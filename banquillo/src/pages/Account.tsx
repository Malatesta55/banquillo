import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { resetDemo } from '../lib/demoRepo';
import { ConfirmButton, TextInput } from '../components/ui';

export function Login() {
  const { repo, me, run } = useStore();
  const nav = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  if (me) return <Navigate to="/" replace />;

  return (
    <div className="card auth">
      <div><div className="eyebrow">Tu cuenta de entrenador</div><h1>{mode === 'in' ? 'Entrar' : 'Crear cuenta'}</h1></div>
      {repo.mode === 'demo' && <div className="banner">Modo demo. Prueba con <b>andres@demo</b>, <b>marta@demo</b> o <b>javi@demo</b> y cualquier contraseña, o crea una cuenta nueva.</div>}
      {sent ? <p>Te hemos enviado un email para confirmar la cuenta. Ábrelo y vuelve aquí para entrar.</p> : (
        <form style={{ display: 'grid', gap: 12 }} onSubmit={async e => {
          e.preventDefault(); setError(''); setPending(true);
          const fd = new FormData(e.currentTarget);
          const email = String(fd.get('email')), pass = String(fd.get('password'));
          try {
            if (mode === 'in') { await repo.signIn(email, pass); nav('/'); }
            else {
              const confirm = await repo.signUp(email, pass, String(fd.get('name')));
              if (confirm) setSent(true); else nav('/equipos');
            }
          } catch (err) { setError(translate((err as Error).message)); }
          setPending(false);
          void run;
        }}>
          {mode === 'up' && <label>Nombre de entrenador<input type="text" id="a-name" name="name" required placeholder="Cómo te verán los demás" /></label>}
          <label>Email<input type="text" inputMode="email" autoComplete="email" id="a-email" name="email" required /></label>
          <label>Contraseña<input type="password" id="a-pass" name="password" required minLength={repo.mode === 'demo' ? 1 : 6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '8px 10px', color: 'var(--ink)' }} /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" type="submit" disabled={pending}>{mode === 'in' ? 'Entrar' : 'Crear cuenta'}</button>
        </form>)}
      <button className="link" style={{ fontWeight: 500 }} onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(''); setSent(false); }}>
        {mode === 'in' ? '¿Primera vez? Crea tu cuenta' : '¿Ya tienes cuenta? Entra'}
      </button>
    </div>
  );
}

function translate(m: string) {
  if (/invalid login/i.test(m)) return 'Email o contraseña incorrectos.';
  if (/already registered/i.test(m)) return 'Ya existe una cuenta con ese email.';
  if (/email not confirmed/i.test(m)) return 'Confirma tu email antes de entrar (revisa tu bandeja de entrada).';
  if (/password should be/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  return m;
}

export function Account() {
  const { me, repo, run } = useStore();
  const nav = useNavigate();
  if (!me) return <Navigate to="/entrar" replace />;
  return (
    <>
      <section className="head"><div><div className="eyebrow">Perfil</div><h1>Tu cuenta</h1></div></section>
      <div className="card"><div className="fields">
        <label>Nombre de entrenador<TextInput id="acc-name" value={me.name} onCommit={n => run(() => repo.updateProfile(n), 'Nombre actualizado')} /></label>
      </div>
        <div className="row"><button className="btn" onClick={async () => { await repo.signOut(); nav('/'); }}>Cerrar sesión</button></div>
      </div>
      {repo.mode === 'demo' && <div className="card"><h3>Modo demo</h3><p className="note">Los datos de la demo viven solo en este navegador.</p>
        <div className="row"><ConfirmButton className="btn" label="Restablecer datos de ejemplo" confirm="Pulsa otra vez para restablecer" onConfirm={resetDemo} /></div></div>}
    </>
  );
}
