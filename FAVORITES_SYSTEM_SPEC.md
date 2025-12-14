# Favorites System Specification

## Overview
A server-side favorites system that allows users to mark generated images as favorites. Favorites are persisted on the server, enabling cross-device synchronization and data persistence.

---

## Server-Side Requirements

### 1. Database Schema Changes

#### Add `is_favorite` field to generated images table
```sql
ALTER TABLE generated_images 
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- Optional: Add index for faster favorites queries
CREATE INDEX idx_generated_images_favorite ON generated_images(is_favorite) 
WHERE is_favorite = TRUE;
```

**Field Details:**
- **Type:** `BOOLEAN` (or `TINYINT(1)` in MySQL)
- **Default:** `FALSE`
- **Nullable:** `FALSE`
- **Indexed:** Yes (for performance when filtering favorites)

### 2. API Endpoints

#### 2.1 Toggle Favorite Status
**Endpoint:** `POST /api/generated-images/{image_id}/favorite`

**Request:**
```http
POST /api/generated-images/832bd668-15b8-4683-903f-958311c159c4/favorite
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "is_favorite": true
}
```

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

**Implementation Notes:**
- Extract `image_id` from URL path (filename without extension)
- Validate image exists and belongs to authenticated user (if auth required)
- Update `is_favorite` field in database
- Return updated status in response
- Handle race conditions (concurrent toggles)

#### 2.2 Get Favorites Only
**Endpoint:** `GET /api/generated-images?favorites_only=true`

**Request:**
```http
GET /api/generated-images?favorites_only=true
Authorization: Bearer {api_key}
```

**Response (200 OK):**
```json
[
  {
    "created_at": 1765684559.365637,
    "deleted": false,
    "filename": "832bd668-15b8-4683-903f-958311c159c4.png",
    "is_favorite": true,
    "prompt": "A tiny blue baby elephant...",
    "recipe_items": [...],
    "url": "/static/generated/832bd668-15b8-4683-903f-958311c159c4.png"
  },
  ...
]
```

**Query Parameters:**
- `favorites_only` (boolean, optional): If `true`, return only favorited images
- `deleted` (boolean, optional): If `false`, exclude deleted images (default behavior)
- `limit` (integer, optional): Limit number of results
- `offset` (integer, optional): Pagination offset

**Implementation Notes:**
- Filter by `is_favorite = TRUE` when `favorites_only=true`
- Still respect `deleted = FALSE` filter (don't return deleted favorites)
- Maintain existing sorting (newest first by `created_at`)
- Return empty array if no favorites exist

#### 2.3 Update Existing Endpoint Response
**Endpoint:** `GET /api/generated-images` (existing endpoint)

**Change Required:** Add `is_favorite` field to each image object in response.

**Before:**
```json
{
  "filename": "832bd668-15b8-4683-903f-958311c159c4.png",
  "url": "/static/generated/832bd668-15b8-4683-903f-958311c159c4.png",
  "created_at": 1765684559.365637,
  "prompt": "...",
  "recipe_items": [...]
}
```

**After:**
```json
{
  "filename": "832bd668-15b8-4683-903f-958311c159c4.png",
  "url": "/static/generated/832bd668-15b8-4683-903f-958311c159c4.png",
  "created_at": 1765684559.365637,
  "is_favorite": true,  // ← NEW FIELD
  "prompt": "...",
  "recipe_items": [...]
}
```

**Implementation Notes:**
- Include `is_favorite` in SELECT query
- Default to `FALSE` for existing images (backward compatible)
- Ensure field is always present (never null)

### 3. Server-Side Validation & Security

#### 3.1 Authentication
- Require valid API key in `Authorization` header
- Verify user has permission to favorite/unfavorite images
- If user-specific favorites: verify image belongs to requesting user

#### 3.2 Input Validation
- Validate `image_id` format (UUID or expected filename pattern)
- Validate `is_favorite` is boolean (not string "true"/"false")
- Reject requests for partial images (if server tracks this)
- Reject requests for deleted images (optional: allow unfavoriting deleted)

#### 3.3 Error Handling
- **404:** Image not found
- **400:** Invalid request body or parameters
- **401:** Unauthorized (invalid/missing API key)
- **500:** Server error (database connection, etc.)

### 4. Database Migration Strategy

#### Option A: Additive Migration (Recommended)
```sql
-- Step 1: Add column with default FALSE
ALTER TABLE generated_images 
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- Step 2: Backfill existing data (if needed)
-- No action needed - default FALSE is correct

-- Step 3: Add index for performance
CREATE INDEX idx_generated_images_favorite 
ON generated_images(is_favorite) 
WHERE is_favorite = TRUE;
```

**Benefits:**
- Non-breaking change (existing code continues to work)
- Backward compatible (defaults to `FALSE`)
- Can deploy incrementally

#### Option B: Nullable Column (Alternative)
```sql
ALTER TABLE generated_images 
ADD COLUMN is_favorite BOOLEAN NULL;

-- Then update to NOT NULL after backfill
UPDATE generated_images SET is_favorite = FALSE WHERE is_favorite IS NULL;
ALTER TABLE generated_images ALTER COLUMN is_favorite SET NOT NULL;
```

**Use if:** You need to distinguish "never set" vs "explicitly false"

---

## Client-Side Requirements

### 1. Data Model Updates

#### Update `GeneratedImage` struct
```swift
struct GeneratedImage: Codable, Identifiable {
    let url: String
    let filename: String
    let createdAt: TimeInterval
    let prompt: String?
    let recipeItems: [RecipeItem]?
    let deleted: Bool?
    let isFavorite: Bool? // NEW: Server-provided favorite status
    
    // ... existing properties ...
    
    enum CodingKeys: String, CodingKey {
        case url
        case filename
        case createdAt = "created_at"
        case prompt
        case recipeItems = "recipe_items"
        case deleted
        case isFavorite = "is_favorite" // NEW
    }
}
```

**Notes:**
- Use optional `Bool?` for backward compatibility (if server doesn't always include it)
- Or use `Bool` with default `false` if server always provides it

### 2. API Client Methods

#### Add to `APIClient.swift`
```swift
// MARK: - Favorites

func toggleFavorite(imageId: String, isFavorite: Bool) -> AnyPublisher<FavoriteResponse, Error> {
    // Extract image ID from filename if needed
    let imageIdWithoutExt = imageId.replacingOccurrences(of: ".png", with: "")
    
    guard let url = URL(string: "\(baseURL)/api/generated-images/\(imageIdWithoutExt)/favorite") else {
        return Fail(error: URLError(.badURL))
            .eraseToAnyPublisher()
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
    
    let body: [String: Any] = ["is_favorite": isFavorite]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    return URLSession.shared.dataTaskPublisher(for: request)
        .map(\.data)
        .decode(type: FavoriteResponse.self, decoder: JSONDecoder())
        .eraseToAnyPublisher()
}

func getFavorites() -> AnyPublisher<[GeneratedImage], Error> {
    guard let url = URL(string: "\(baseURL)/api/generated-images?favorites_only=true") else {
        return Fail(error: URLError(.badURL))
            .eraseToAnyPublisher()
    }
    
    var request = URLRequest(url: url)
    request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
    
    return URLSession.shared.dataTaskPublisher(for: request)
        .map(\.data)
        .decode(type: [GeneratedImage].self, decoder: JSONDecoder())
        .eraseToAnyPublisher()
}
```

#### Response Model
```swift
struct FavoriteResponse: Codable {
    let success: Bool
    let imageId: String
    let isFavorite: Bool
    let message: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case imageId = "image_id"
        case isFavorite = "is_favorite"
        case message
    }
}
```

### 3. ViewModel Updates

#### Add to `MainViewModel.swift`
```swift
// Published property for favorites filter
@Published var showFavoritesOnly: Bool = false {
    didSet {
        loadHistory() // Reload when filter changes
    }
}

// Computed property for filtered history
var filteredHistoryImages: [GeneratedImage] {
    if showFavoritesOnly {
        return historyImages.filter { $0.isFavorite == true }
    }
    return historyImages
}

// Toggle favorite function
func toggleFavorite(for image: GeneratedImage) {
    let newFavoriteStatus = !(image.isFavorite ?? false)
    let imageId = image.filename.replacingOccurrences(of: ".png", with: "")
    
    apiClient.toggleFavorite(imageId: imageId, isFavorite: newFavoriteStatus)
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    print("❌ Error toggling favorite: \(error.localizedDescription)")
                    // Optionally: Show error to user, revert optimistic update
                }
            },
            receiveValue: { [weak self] response in
                guard let self = self else { return }
                print("✅ Favorite toggled: \(response.imageId) -> \(response.isFavorite)")
                
                // Update local state optimistically
                if let index = self.historyImages.firstIndex(where: { $0.id == image.id }) {
                    // Create updated image with new favorite status
                    var updatedImage = self.historyImages[index]
                    // Note: Since GeneratedImage is a struct with let properties,
                    // you'll need to replace the entire item or make isFavorite mutable
                    // Better: Reload from server after a short delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        self.loadHistory()
                    }
                }
            }
        )
        .store(in: &cancellables)
}

// Update loadHistory to support favorites filter
private func loadHistory() {
    isLoadingHistory = true
    
    let endpoint = showFavoritesOnly 
        ? apiClient.getFavorites()
        : apiClient.getGeneratedImages()
    
    endpoint
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                self?.isLoadingHistory = false
                if case .failure(let error) = completion {
                    print("❌ Error loading history: \(error.localizedDescription)")
                }
            },
            receiveValue: { [weak self] images in
                guard let self = self else { return }
                let filtered = images.filter { 
                    $0.deleted != true && !$0.isPartial 
                }
                let sorted = filtered.sorted { $0.createdAt > $1.createdAt }
                self.historyImages = sorted
            }
        )
        .store(in: &cancellables)
}
```

**Note:** Since `GeneratedImage` uses `let` properties, you'll need to either:
- Make `isFavorite` mutable (change to `var`), or
- Replace entire image in array after server response, or
- Reload history after toggle (simpler, ensures sync)

### 4. UI Updates

#### Add Favorite Indicator to History Carousel
Update `RightColumnView` in `MainView.swift`:

```swift
// In historyCarouselItems computed property
private var historyCarouselItems: [CarouselItem] {
    filteredHistoryImages.prefix(20).map { image in
        let baseURL = APIClient.shared.baseURL
        let imageURLString = image.url.hasPrefix("http") ? image.url : "\(baseURL)\(image.url)"
        
        return CarouselItem(
            id: image.id,
            imageURL: imageURLString,
            displayName: image.filename.replacingOccurrences(of: ".png", with: "").replacingOccurrences(of: "_", with: " ").capitalized,
            isFavorite: image.isFavorite ?? false // Pass favorite status to carousel item
        )
    }
}
```

#### Add Favorite Toggle Button
Add heart icon overlay to carousel tiles (in `TileView.swift` or carousel component):

```swift
// In TileView or CarouselItem view
Button(action: {
    viewModel.toggleFavorite(for: image)
}) {
    Image(systemName: image.isFavorite ? "heart.fill" : "heart")
        .foregroundColor(image.isFavorite ? .red : .white)
        .font(.system(size: 16))
        .padding(8)
        .background(Color.black.opacity(0.3))
        .clipShape(Circle())
}
.position(x: tileWidth - 20, y: 20) // Top-right corner
```

#### Add Favorites Filter Toggle
Add filter button in `RightColumnView`:

```swift
HStack {
    Text("History")
        .font(.headline)
    
    Spacer()
    
    Button(action: {
        viewModel.showFavoritesOnly.toggle()
    }) {
        Image(systemName: viewModel.showFavoritesOnly ? "heart.fill" : "heart")
            .foregroundColor(viewModel.showFavoritesOnly ? .red : .gray)
    }
}
.padding(.horizontal)
```

---

## Implementation Phases

### Phase 1: Server Foundation
1. ✅ Add `is_favorite` column to database
2. ✅ Update `GET /api/generated-images` to include `is_favorite`
3. ✅ Implement `POST /api/generated-images/{id}/favorite` endpoint
4. ✅ Add validation and error handling
5. ✅ Test with curl/Postman

### Phase 2: Client Integration
1. ✅ Update `GeneratedImage` model
2. ✅ Add API client methods
3. ✅ Update ViewModel with toggle function
4. ✅ Add favorite indicator to UI
5. ✅ Test optimistic updates

### Phase 3: Enhanced Features
1. ✅ Add favorites filter toggle
2. ✅ Implement `GET /api/generated-images?favorites_only=true`
3. ✅ Add empty state for "No favorites"
4. ✅ Add animations/feedback
5. ✅ Handle edge cases (deleted images, network errors)

---

## Testing Checklist

### Server-Side Tests
- [ ] Toggle favorite on existing image
- [ ] Toggle favorite on non-existent image (404)
- [ ] Get all images includes `is_favorite` field
- [ ] Get favorites only returns only favorited images
- [ ] Favorites persist after server restart
- [ ] Concurrent toggle requests handled correctly
- [ ] Partial images cannot be favorited (if applicable)

### Client-Side Tests
- [ ] Favorite indicator displays correctly
- [ ] Toggle favorite updates UI immediately (optimistic)
- [ ] Toggle favorite syncs with server
- [ ] Favorites filter shows only favorited images
- [ ] Empty state displays when no favorites
- [ ] Network error handling (revert optimistic update)
- [ ] Favorites persist after app restart

---

## Open Questions / Decisions Needed

1. **Partial Images:** Can partial images be favorited? (Recommendation: No, they're filtered out anyway)
2. **Deleted Images:** Can deleted images remain favorited? (Recommendation: Hide deleted favorites from UI, but allow unfavoriting)
3. **Bulk Actions:** Should users be able to favorite/unfavorite multiple images at once? (Future enhancement)
4. **Favorite Limit:** Should there be a maximum number of favorites? (Recommendation: No limit initially)
5. **User-Specific:** Are favorites user-specific? (Assumption: Yes, if auth is implemented)
6. **Default State:** Should new images default to `is_favorite = false`? (Yes, confirmed in spec)

---

## Migration Notes

### Backward Compatibility
- Existing images will have `is_favorite = FALSE` (default)
- Client code should handle missing `is_favorite` field gracefully (use optional `Bool?`)
- Server should always include `is_favorite` in responses (never null)

### Rollout Strategy
1. Deploy server changes (add column, update endpoints)
2. Deploy client changes (handle new field)
3. Enable favorite toggle UI
4. Monitor for errors/performance issues

---

## Performance Considerations

### Database
- Index on `is_favorite` for fast filtering
- Consider composite index if filtering by `is_favorite` + `deleted` + `created_at`

### API
- Favorites-only query should be fast with proper index
- Consider caching favorites count if needed
- Pagination for large favorite lists (future)

### Client
- Optimistic UI updates for instant feedback
- Debounce rapid toggle requests (optional)
- Cache favorite status locally (optional, for offline support)
