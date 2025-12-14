# Favorites System - Server Implementation Request

**Date:** December 14, 2025  
**Status:** 🔴 Pending Implementation  
**Priority:** Medium

---

## Overview

The iOS client needs a server-side favorites system that allows users to mark generated images as favorites. Favorites should be persisted on the server to enable cross-device synchronization and data persistence.

---

## Requirements Summary

1. **Database:** Add `is_favorite` boolean field to generated images table
2. **API Endpoint:** Add `POST /api/generated-images/{image_id}/favorite` to toggle favorite status
3. **API Response:** Include `is_favorite` field in existing `GET /api/generated-images` response
4. **Optional:** Add `GET /api/generated-images?favorites_only=true` query parameter support

---

## 1. Database Schema Changes

### Add `is_favorite` Column

**Table:** `generated_images` (or equivalent)

**SQL Migration:**
```sql
ALTER TABLE generated_images 
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- Optional: Add index for performance when filtering favorites
CREATE INDEX idx_generated_images_favorite 
ON generated_images(is_favorite) 
WHERE is_favorite = TRUE;
```

**Field Details:**
- **Type:** `BOOLEAN` (or `TINYINT(1)` in MySQL)
- **Default:** `FALSE` (all existing images default to not favorited)
- **Nullable:** `FALSE` (always has a value)
- **Indexed:** Recommended (for fast favorites-only queries)

**Backward Compatibility:**
- Existing images will have `is_favorite = FALSE` (default value)
- No data migration needed
- Non-breaking change for existing API consumers

---

## 2. New API Endpoint: Set Favorite Status

### Endpoint Specification

**URL:** `POST /api/generated-images/{image_id}/favorite`

**Path Parameter:**
- `image_id` (string, required): The image ID (filename without `.png` extension)
  - Example: `832bd668-15b8-4683-903f-958311c159c4`
  - Format: UUID (matches existing image ID pattern)

**Request Headers:**
```
Authorization: Bearer {api_key}
Content-Type: application/json
```

**Request Body:**
```json
{
  "is_favorite": true
}
```

**Request Body Fields:**
- `is_favorite` (boolean, required): `true` to set as favorite, `false` to remove favorite
  - Single endpoint handles both favorite and unfavorite operations
  - Client sends `true` to favorite, `false` to unfavorite

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "image_id": "832bd668-15b8-4683-903f-958311c159c4",
  "is_favorite": true,
  "message": "Image favorited successfully"
}
```

**Response (Error - 404 Not Found):**
```json
{
  "success": false,
  "error": "Image not found",
  "image_id": "invalid-id"
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid request body",
  "message": "is_favorite must be a boolean"
}
```

**Response (Error - 401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

### Implementation Notes

1. **Image ID Extraction:**
   - Extract `image_id` from URL path
   - Remove `.png` extension if present in filename
   - Match against `filename` field in database (without extension)

2. **Validation:**
   - Verify image exists in database
   - Validate `is_favorite` is a boolean (not string "true"/"false")
   - Reject requests for deleted images (optional: allow unfavoriting deleted)
   - Note: Partial images are automatically deleted by server upon generation complete, so no need to handle them

3. **Database Update:**
   - Update `is_favorite` field for the specified image
   - Use atomic update (single SQL UPDATE statement)
   - Handle race conditions (concurrent toggles should be safe)

4. **Error Handling:**
   - Return 404 if image not found
   - Return 400 if request body is invalid
   - Return 401 if API key is missing/invalid
   - Return 500 for database/server errors

---

## 3. Update Existing Endpoint Response

### Endpoint: `GET /api/generated-images`

**Change Required:** Add `is_favorite` field to the existing image metadata in the response.

**Note:** This endpoint already returns full image metadata for each image. We're simply asking to include the `is_favorite` status as an additional field in that existing metadata.

**Current Response Format:**
```json
[
  {
    "created_at": 1765684559.365637,
    "deleted": false,
    "filename": "832bd668-15b8-4683-903f-958311c159c4.png",
    "prompt": "A tiny blue baby elephant...",
    "recipe_items": [...],
    "url": "/static/generated/832bd668-15b8-4683-903f-958311c159c4.png",
    "metadata": { ... }
  }
]
```

**Updated Response Format:**
```json
[
  {
    "created_at": 1765684559.365637,
    "deleted": false,
    "filename": "832bd668-15b8-4683-903f-958311c159c4.png",
    "is_favorite": true,  // ← NEW FIELD (always present, boolean)
    "prompt": "A tiny blue baby elephant...",
    "recipe_items": [...],
    "url": "/static/generated/832bd668-15b8-4683-903f-958311c159c4.png",
    "metadata": { ... }
  }
]
```

**Implementation Notes:**
- Include `is_favorite` in SELECT query (add to existing query that returns image metadata)
- Always include the field (never null/omitted)
- Default to `FALSE` for existing images (handled by database default)
- Field should be boolean type in JSON (not string)
- This is a simple addition to the existing response structure - no endpoint changes needed

**Data Size Impact:**
- `is_favorite` is a boolean field, adding only ~15-20 characters per image (`"is_favorite": true,`)
- Compared to existing response size (~3,400+ chars per image with full metadata), this is negligible
- If server team prefers, we can make it optional via query parameter (e.g., `?include_favorites=true`), but default inclusion is preferred for simplicity

---

## 4. Optional: Favorites-Only Query Parameter

### Endpoint: `GET /api/generated-images?favorites_only=true`

**Query Parameter:**
- `favorites_only` (boolean, optional): If `true`, return only images where `is_favorite = TRUE`

**Request Example:**
```
GET /api/generated-images?favorites_only=true
Authorization: Bearer {api_key}
```

**Response:**
```json
[
  {
    "created_at": 1765684559.365637,
    "deleted": false,
    "filename": "832bd668-15b8-4683-903f-958311c159c4.png",
    "is_favorite": true,
    "prompt": "...",
    "recipe_items": [...],
    "url": "/static/generated/832bd668-15b8-4683-903f-958311c159c4.png"
  }
]
```

**Implementation Notes:**
- Filter by `is_favorite = TRUE` when `favorites_only=true`
- Still respect `deleted = FALSE` filter (don't return deleted favorites)
- Maintain existing sorting (newest first by `created_at`)
- Return empty array `[]` if no favorites exist
- If `favorites_only` is not provided or `false`, return all images (existing behavior)

**Priority:** This is optional - client can filter favorites client-side if needed. However, server-side filtering is more efficient for large datasets.

---

## 5. Edge Cases & Validation

### Partial Images
- **Status:** ✅ Handled by server - partial images are automatically deleted upon generation complete
- **Implementation:** No special handling needed - partial images won't exist in database when user tries to favorite

### Deleted Images
- **Question:** Can deleted images remain favorited?
- **Recommendation:** Hide deleted favorites from `GET /api/generated-images` response (existing `deleted = false` filter)
- **Implementation:** Allow unfavoriting deleted images (don't reject), but don't return them in list responses

### Concurrent Requests
- **Scenario:** User rapidly toggles favorite status
- **Implementation:** Use database-level atomic updates (single UPDATE statement). Last write wins is acceptable behavior.

### Image Not Found
- **Scenario:** Client requests to favorite non-existent image
- **Implementation:** Return 404 with clear error message

---

## 6. Testing Requirements

### Manual Testing Checklist

**Database:**
- [ ] Verify `is_favorite` column exists with default `FALSE`
- [ ] Verify index exists (if implemented)
- [ ] Verify existing images have `is_favorite = FALSE`

**Toggle Favorite Endpoint:**
- [ ] `POST /api/generated-images/{valid_id}/favorite` with `is_favorite: true` → returns 200, updates database
- [ ] `POST /api/generated-images/{valid_id}/favorite` with `is_favorite: false` → returns 200, updates database
- [ ] `POST /api/generated-images/{invalid_id}/favorite` → returns 404
- [ ] `POST /api/generated-images/{valid_id}/favorite` with missing `is_favorite` → returns 400
- [ ] `POST /api/generated-images/{valid_id}/favorite` with `is_favorite: "true"` (string) → returns 400
- [ ] `POST /api/generated-images/{valid_id}/favorite` without API key → returns 401

**Get Images Endpoint:**
- [ ] `GET /api/generated-images` → includes `is_favorite` field in all images
- [ ] `GET /api/generated-images?favorites_only=true` → returns only favorited images (if implemented)
- [ ] `GET /api/generated-images?favorites_only=false` → returns all images (if implemented)
- [ ] Verify `is_favorite` is boolean type (not string)

**Edge Cases:**
- [ ] Toggle favorite on deleted image → allow unfavoriting, but don't return in list
- [ ] Rapid consecutive toggles → last write wins, no errors
- [ ] Set favorite to `true` when already `true` → should succeed (idempotent)
- [ ] Set favorite to `false` when already `false` → should succeed (idempotent)

### Example curl Commands

```bash
# Toggle favorite to true
curl -X POST "http://abbies.world:8000/api/generated-images/832bd668-15b8-4683-903f-958311c159c4/favorite" \
  -H "Authorization: Bearer {api_key}" \
  -H "Content-Type: application/json" \
  -d '{"is_favorite": true}'

# Remove favorite (set to false)
curl -X POST "http://abbies.world:8000/api/generated-images/832bd668-15b8-4683-903f-958311c159c4/favorite" \
  -H "Authorization: Bearer {api_key}" \
  -H "Content-Type: application/json" \
  -d '{"is_favorite": false}'

# Get all images (should include is_favorite field)
curl -X GET "http://abbies.world:8000/api/generated-images" \
  -H "Authorization: Bearer {api_key}"

# Get favorites only (if implemented)
curl -X GET "http://abbies.world:8000/api/generated-images?favorites_only=true" \
  -H "Authorization: Bearer {api_key}"
```

---

## 7. Client Expectations

### Backward Compatibility
- Client code will handle missing `is_favorite` field gracefully (uses optional `Bool?`)
- However, server should **always** include `is_favorite` in responses (never null/omitted)
- Default value of `FALSE` for existing images is acceptable

### Field Naming
- Server field: `is_favorite` (snake_case)
- Client property: `isFavorite` (camelCase, via `CodingKeys` mapping)

### Response Format
- `is_favorite` must be a boolean type in JSON (not string `"true"`/`"false"`)
- Field should always be present (not conditionally included)

---

## 8. Implementation Priority

### Phase 1: Core Functionality (Required)
1. ✅ Add `is_favorite` column to database
2. ✅ Update `GET /api/generated-images` to include `is_favorite` field
3. ✅ Implement `POST /api/generated-images/{id}/favorite` endpoint
4. ✅ Add validation and error handling

### Phase 2: Optional Enhancements
1. ⚪ Add `favorites_only` query parameter to `GET /api/generated-images`
2. ⚪ Add database index for performance
3. ⚪ Add bulk favorite/unfavorite endpoint (future enhancement)

---

## 9. Questions for Server Team

1. **Deleted Images:** Should deleted images be favoritable? (Recommendation: Allow unfavoriting, but don't return in list)
2. **User-Specific:** Are favorites user-specific? (Assumption: Yes, if authentication is implemented)
3. **Performance:** Should we add an index on `is_favorite`? (Recommendation: Yes, if `favorites_only` query is implemented)
4. **Timeline:** When can we expect this to be deployed?
5. **Idempotency:** Should setting `is_favorite` to the same value it already has be a no-op? (Recommendation: Yes, return success)

---

## 10. After Implementation

Once the server changes are deployed, the client will:

1. Update `GeneratedImage` model to include `isFavorite` property
2. Add API client methods for toggling favorites
3. Add UI for favorite indicator and toggle button
4. Test with the new endpoints

**Client will verify:**
- ✅ `GET /api/generated-images` includes `is_favorite` field
- ✅ `POST /api/generated-images/{id}/favorite` successfully toggles favorite status
- ✅ Favorite status persists after app restart
- ✅ Favorites sync correctly across devices (if applicable)

---

## Summary

**Required Changes:**
1. Database: Add `is_favorite BOOLEAN DEFAULT FALSE NOT NULL` column
2. API: Add `POST /api/generated-images/{image_id}/favorite` endpoint (single endpoint accepts `true` or `false`)
3. API: Include `is_favorite` field in existing `GET /api/generated-images` response metadata

**Note:** 
- Partial images are automatically deleted by server, so no special handling needed for them.
- The `GET /api/generated-images` endpoint already returns full image metadata - we're just adding `is_favorite` as an additional field to that existing response.
- `is_favorite` is a boolean (minimal data overhead: ~15-20 chars per image). If server team prefers to make it optional via query parameter, that's acceptable, but default inclusion is preferred for client simplicity.

**Optional Changes:**
1. Add `favorites_only` query parameter to `GET /api/generated-images`
2. Add database index on `is_favorite` for performance

**Timeline:** Please confirm when these changes can be deployed so the client team can coordinate implementation.

---

**Contact:** Please reach out with any questions or clarifications needed for implementation.
