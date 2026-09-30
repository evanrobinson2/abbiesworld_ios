import { ALLOWED_EMAIL } from '../../lib/allowlist.js';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const denied = params?.denied === '1';
  const returnTo =
    typeof params?.returnTo === 'string' && params.returnTo.startsWith('/')
      ? params.returnTo
      : '/';

  return (
    <main className="shell">
      <div className="card" style={{ marginTop: 48 }}>
        <h1 style={{ marginTop: 0 }}>Send to Abbie</h1>
        <p className="muted">
          Household inbox for Suno songs, Midjourney stills, and phone photos.
        </p>
        {denied ? (
          <p style={{ color: '#b91c1c', fontWeight: 700 }}>
            That Google account isn&apos;t on the allowlist. Only{' '}
            <code>{ALLOWED_EMAIL}</code> can sign in.
          </p>
        ) : (
          <p className="muted">
            Sign in with Google as <strong>{ALLOWED_EMAIL}</strong>.
          </p>
        )}
        <a
          className="btn"
          href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
          style={{ display: 'inline-block', marginTop: 8 }}
        >
          Continue with Google
        </a>
      </div>
    </main>
  );
}
