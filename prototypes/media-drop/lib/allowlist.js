export const ALLOWED_EMAIL = (
  process.env.ALLOWED_EMAIL || 'evanr2@gmail.com'
).trim().toLowerCase();

export function isAllowedEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === ALLOWED_EMAIL;
}
