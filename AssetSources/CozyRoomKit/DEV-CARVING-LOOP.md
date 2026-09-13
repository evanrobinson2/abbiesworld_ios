# Parent Asset Carving Loop

The in-app **Asset Carving Lab** is an age-gated developer workflow for turning
a light-background image atlas into reviewed transparent PNG candidates.

## Parent flow

1. Open **Settings → Grown-Up Controls** and pass the grown-up check.
2. Enable **World Layout Developer Mode**.
3. Open **Asset Carving Lab**.
4. Paste an HTTPS CDN image URL and choose **Fetch and Preview**.
5. Confirm the numbered detection boxes, then open each candidate.
6. Compare its original crop with the checkerboard transparency preview.
7. Edit the proposed label and category, then approve or reject the item.
8. After every candidate has a decision, choose **Save Approved Set**.
9. Share the resulting directory when it is ready for source-controlled review.

## Local output

Approved sets are written under the app's Application Support directory:

```text
DevAssetCarving/<session-id>/
  review-manifest.json
  assets/
    item-001.png
    item-002.png
```

The manifest records the source SHA-256, source dimensions, extraction
parameters, inferred border color, crop bounds, labels, categories, and all
approve/reject decisions. Signed URL query parameters are never persisted in
the manifest or console diagnostics. The raw source atlas is not copied into
Application Support.

## Publishing approved assets

Saving is a review handoff, not production publication. New games publish the
approved PNGs through
[Game Asset API v1](../../docs/current-state/GAME_ASSET_REGISTRY_ADOPTION.md).
The publishing tool must choose the game key and stable asset key explicitly,
carry the review metadata forward, and use `expectedRevision` to prevent stale
updates. The asset-registry admin credential must never enter the iOS app.

## Current boundary

Version 1 is deterministic connected-component extraction for atlases whose
objects contrast with a mostly uniform border color. Touching objects can be
proposed as one candidate, and a visual group with gaps can be proposed as
several candidates. The parent must reject a bad proposal; polygon editing,
merge/split correction, and promotion into the shipping catalog remain
explicit follow-up stages rather than silent automatic publication.
