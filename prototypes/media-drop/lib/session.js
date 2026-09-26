import { NextResponse } from 'next/server';
import { auth0 } from './auth0.js';
import { isAllowedEmail } from './allowlist.js';

/**
 * Require an Auth0 session whose email is on the household allowlist.
 * Returns { session, email } or a NextResponse to send.
 */
export async function requireAllowedSession() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'sign_in_required' }, { status: 401 }),
    };
  }
  const email = session.user.email;
  if (!isAllowedEmail(email)) {
    return {
      error: NextResponse.json(
        { error: 'not_allowed', email: email ?? null },
        { status: 403 }
      ),
    };
  }
  return { session, email: email.toLowerCase() };
}
