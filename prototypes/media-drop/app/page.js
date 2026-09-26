import { auth0 } from '../lib/auth0.js';
import { isAllowedEmail } from '../lib/allowlist.js';
import { redirect } from 'next/navigation';
import DropClient from './DropClient.js';

export default async function HomePage() {
  const session = await auth0.getSession();
  if (!session?.user) {
    redirect('/login');
  }
  if (!isAllowedEmail(session.user.email)) {
    redirect('/login?denied=1');
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5175';

  return <DropClient email={session.user.email} baseUrl={baseUrl} />;
}
