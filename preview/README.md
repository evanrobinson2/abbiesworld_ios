# Instant previews
Put a static page in `preview/<name>/` (needs `index.html`; use relative paths), push the branch. About a minute later
it is at https://app.abbies.world/r2/previews/<name>/index.html with no Vercel deploy. Delete the folder to remove it.
Previews are scratch and never ship to production; real features still go through main and the deploy batch.
