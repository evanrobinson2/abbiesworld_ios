# Style Assets Endpoint Issue - Client Inquiry

**Date:** December 14, 2025  
**From:** iOS Client Team  
**To:** Server Team  
**Subject:** `/api/assets/styles` endpoint not returning assets

---

## Summary

The iOS client is attempting to load style assets using `/api/assets/styles`, but the endpoint is not returning any assets. The manifest API works correctly and shows all 84 styles are available.

---

## Current Client Implementation

The iOS client uses the following pattern for loading assets:

```swift
assetsService.getAssets(type: "styles")
// Calls: GET /api/assets/styles
```

This same pattern works for:
- ✅ `/api/assets/friends` - Returns friends assets
- ✅ `/api/assets/outfits` - Returns outfits assets  
- ✅ `/api/assets/places` - Returns places assets
- ❌ `/api/assets/styles` - Returns error (see below)

---

## Issue Details

### Endpoint Response

**Request:** `GET /api/assets/styles`  
**Response:**
```json
{
  "available_types": [
    "assets",
    "assets/styles",
    "backgrounds",
    "friends",
    "images",
    "minigames",
    "minigames/goonpopper",
    "minigames/waypoint",
    "music",
    "music/goonpopper",
    "music/main",
    "outfits",
    "places",
    "test",
    "ui",
    "ui/icons"
  ],
  "error": "Asset type 'styles' not found"
}
```

**Observations:**
1. The error says `'styles'` not found
2. But `"assets/styles"` appears in the `available_types` list
3. The client expects the endpoint to work like other asset types

### Alternative Endpoints Tested

1. **`/api/assets/assets/styles`** - Returns empty array (0 assets)
2. **`/api/assets/manifest`** - ✅ Works correctly, returns all 84 styles

---

## What Works

### Manifest API

**Request:** `GET /api/assets/manifest`  
**Response:** Returns nested structure with all 84 styles:

```json
{
  "folders": {
    "assets": {
      "folders": {
        "styles": {
          "files": [
            {
              "id": "crayon",
              "name": "crayon.png",
              "url": "/static/assets/styles/crayon.png",
              "size": 2072893,
              "mime_type": "image/png",
              "modified": "2025-12-14T03:20:34Z"
            },
            ...
          ]
        }
      }
    }
  }
}
```

**Status:** ✅ All 84 styles available with correct `id` fields and URLs

---

## Client Expectations

The iOS client expects `/api/assets/styles` to return the same format as other asset endpoints:

**Expected Response Format:**
```json
{
  "type": "styles",
  "assets": [
    {
      "id": "crayon",
      "name": "crayon.png",
      "type": "styles",
      "url": "/static/assets/styles/crayon.png",
      "size": 2072893,
      "mime_type": "image/png",
      "modified": "2025-12-14T03:20:34Z"
    },
    ...
  ],
  "count": 84
}
```

This matches the format returned by:
- `/api/assets/friends`
- `/api/assets/outfits`
- `/api/assets/places`

---

## Questions for Server Team

1. **Is `/api/assets/styles` supposed to work?**
   - If yes, what needs to be fixed?
   - If no, what is the correct endpoint?

2. **Should the client use `"assets/styles"` instead of `"styles"`?**
   - The error message shows `"assets/styles"` in available_types
   - But `/api/assets/assets/styles` returns 0 assets

3. **Is the manifest API the intended way to access nested assets?**
   - If so, should the client switch to using manifest API?
   - Or is there a simpler endpoint we should use?

4. **Are there any server-side changes needed?**
   - Or is this a client-side configuration issue?

---

## Current Workaround

The client currently:
1. Tries `/api/assets/styles` (fails)
2. Falls back to hardcoded placeholder styles

**Options:**
- Wait for server fix to `/api/assets/styles`
- Update client to use manifest API (requires code changes)
- Use different endpoint pattern if one exists

---

## Verification

**Assets Verified:**
- ✅ All 84 style assets exist on server
- ✅ All have `id` field (e.g., `"crayon"`, `"watercolor"`)
- ✅ All have correct URLs (no double "assets" paths)
- ✅ Image files accessible at `/static/assets/styles/{filename}.png`

**Issue:**
- ❌ `/api/assets/styles` endpoint not working
- ✅ Manifest API works but client doesn't use it

---

## Request

Please either:
1. **Fix `/api/assets/styles`** to return assets in the expected format, OR
2. **Provide guidance** on the correct endpoint/pattern to use for nested asset types like styles

The client is ready to integrate once we have a working endpoint that matches the existing pattern used for friends/outfits/places.

Thank you!

---

**Contact:** Ready to test once endpoint is available or guidance is provided.
