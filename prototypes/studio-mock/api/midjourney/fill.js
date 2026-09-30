// Hosted stub. The browser also tries http://127.0.0.1:8766 when this returns.
// The local Mac studio server (Apple Events) fills an open Midjourney tab.
export async function POST() {
  return Response.json({
    ok: false,
    message:
      "Hosted Studio cannot type into Midjourney. Keep the local helper on :8766 running, or paste with ⌘V.",
  }, { status: 501 });
}
