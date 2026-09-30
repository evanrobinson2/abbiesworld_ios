// Hosted stand-in for the local AppleScript pull in server.py.
// Vercel cannot read an already-open Suno tab on the user's Mac.
export function POST() {
  return Response.json({
    ok: false,
    message: "Suno pull only works on the local studio server. It reads an already-open browser tab on this Mac. Paste the song links instead.",
  });
}
