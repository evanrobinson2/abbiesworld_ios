#!/bin/bash

# Script to enumerate waypoint navigation game assets on the server
# Uses the Assets API to discover available files

# Don't exit on error - we want to check all files
set +e

# Configuration
BASE_URL="${BASE_URL:-http://abbies.world:8000}"
API_KEY="${ABBIES_WORLD_SERVER_API_KEY:-S-4sWsMrIE5TEiMSZlCyeN9ns6xmGqzpcn-InUvWJoc}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Waypoint Navigation Game Asset Enumerator ===${NC}"
echo -e "Server: ${BASE_URL}"
echo -e "API Key: ${API_KEY:0:10}...${NC}\n"

# Function to make API request
api_request() {
    local endpoint="$1"
    local url="${BASE_URL}${endpoint}"
    
    curl -s -H "Authorization: Bearer ${API_KEY}" \
         -H "Accept: application/json" \
         "$url"
}

# Function to check if a file exists via direct static path
check_static_file() {
    local filepath="$1"
    local url="${BASE_URL}/static/assets/minigames/waypoint/${filepath}"
    
    # URL encode spaces in filename
    local encoded_url=$(echo "$url" | sed 's/ /%20/g')
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" \
                      -H "Authorization: Bearer ${API_KEY}" \
                      "$encoded_url" 2>/dev/null)
    
    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✓${NC}"
        return 0
    elif [ "$status" = "000" ]; then
        echo -e "${RED}✗ (Connection failed)${NC}"
        return 1
    else
        echo -e "${RED}✗ (HTTP $status)${NC}"
        return 1
    fi
}

echo -e "${BLUE}1. Checking Assets API endpoints...${NC}\n"

# Check if Assets API is available
echo -n "  Testing /api/assets/types... "
types_response=$(api_request "/api/assets/types")
if echo "$types_response" | grep -q "types"; then
    echo -e "${GREEN}✓${NC}"
    echo "$types_response" | python3 -m json.tool 2>/dev/null || echo "$types_response"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $types_response"
fi

echo ""

# Check waypoint assets via API - try different path formats
echo -e "${BLUE}2. Checking waypoint minigame assets via API...${NC}\n"

echo -n "  Testing /api/assets/minigames/waypoint... "
waypoint_assets=$(api_request "/api/assets/minigames/waypoint")
if echo "$waypoint_assets" | grep -q "assets"; then
    echo -e "${GREEN}✓${NC}"
    echo "$waypoint_assets" | python3 -m json.tool 2>/dev/null || echo "$waypoint_assets"
elif echo "$waypoint_assets" | grep -q "error"; then
    echo -e "${YELLOW}⚠ (API error - trying direct file access)${NC}"
else
    echo -e "${YELLOW}⚠ (unexpected response)${NC}"
fi

echo ""

# Check for b-roll subdirectory
echo -e "${BLUE}3. Checking for b-roll subdirectory...${NC}\n"

echo -n "  Testing /api/assets/minigames/waypoint/b-roll... "
broll_assets=$(api_request "/api/assets/minigames/waypoint/b-roll")
if echo "$broll_assets" | grep -q "assets\|error"; then
    echo -e "${GREEN}✓${NC}"
    echo "$broll_assets" | python3 -m json.tool 2>/dev/null || echo "$broll_assets"
else
    echo -e "${YELLOW}⚠ (may not exist)${NC}"
fi

echo ""

# Direct file checks
echo -e "${BLUE}4. Checking individual asset files (direct static paths)...${NC}\n"

declare -a image_files=(
    "trio_at_base_pixel.png"
    "moonbase.png"
    "moon_buggy_sprite.png"
    "abbie star child.png"
    "cinematic_01_moonbase_wide.png"
    "moon mission 1.png"
    "polaroid_01_ice_cream_party.png"
    "polaroid_02_chase_scene.png"
    "polaroid_03_beard_bows.png"
    "polaroid_04_tea_party.png"
    "polaroid_05_story_time.png"
    "polaroid_06_silly_faces.png"
    "polaroid_07_game_night.png"
    "polaroid_08_art_lesson.png"
    "polaroid_09_group_hug.png"
    "polaroid_10_window_view.png"
)

declare -a audio_files=(
    "moon_base_return.mp3"
    "moon_base_return.ogg"
    "victory_1.mp3"
    "victory_2.mp3"
)

echo -e "${YELLOW}Image Files:${NC}"
for file in "${image_files[@]}"; do
    printf "  %-40s " "$file"
    check_static_file "$file"
done

echo ""
echo -e "${YELLOW}Audio Files:${NC}"
for file in "${audio_files[@]}"; do
    printf "  %-40s " "$file"
    check_static_file "$file"
done

echo ""

# Check cutscene in b-roll subdirectory
echo -e "${BLUE}5. Checking cutscene in b-roll subdirectory...${NC}\n"

echo -n "  cinematic_01_moonbase_wide.png in b-roll/... "
cutscene_url="${BASE_URL}/static/assets/minigames/waypoint/b-roll/cinematic_01_moonbase_wide.png"
status=$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Authorization: Bearer ${API_KEY}" \
          "$cutscene_url")

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓ Found in b-roll/ subdirectory${NC}"
else
    echo -e "${RED}✗ (HTTP $status)${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
echo "Use this information to update the Swift app asset paths."
echo ""

