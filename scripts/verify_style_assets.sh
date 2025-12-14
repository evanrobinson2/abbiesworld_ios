#!/bin/bash

# Style Assets Verification Script
# Verifies that all style assets are available on the server
# Usage: ./scripts/verify_style_assets.sh [base_url] [asset_path]

set -e

# Default values (can be overridden)
BASE_URL="${1:-http://abbies.world:8000}"
ASSET_PATH="${2:-/static/assets/styles}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Style Assets Verification Script"
echo "===================================="
echo "Base URL: $BASE_URL"
echo "Asset Path: $ASSET_PATH"
echo ""

# Complete list of style assets needed (84 total)
# Extracted from MainViewModel.swift loadStyleItems() method
declare -a STYLES=(
    "3d_render"
    "aboriginal_dot"
    "abstract"
    "acrylic"
    "african_textile"
    "art_deco"
    "art_nouveau"
    "baroque"
    "black_white"
    "botanical"
    "chalk"
    "charcoal"
    "charcoal_pastel"
    "chinese_ink"
    "collage"
    "crayon"
    "crystalline"
    "cubist"
    "cyberpunk"
    "digital_painting"
    "digital_traditional"
    "double_exposure"
    "dramatic"
    "dreamy"
    "embroidery"
    "energetic"
    "ethereal"
    "expressionist"
    "fabric"
    "fire"
    "flat_design"
    "forest"
    "fresco"
    "glitch_art"
    "gouache"
    "grunge"
    "high_contrast"
    "holographic"
    "ice"
    "impressionist"
    "ink_wash"
    "islamic_geometric"
    "isometric"
    "japanese_woodblock"
    "liquid"
    "low_poly"
    "marble"
    "marker"
    "metal"
    "mexican_mural"
    "minimalist"
    "mosaic"
    "mysterious"
    "neon"
    "nostalgic"
    "ocean"
    "oil_painting"
    "painterly_photo"
    "pastel"
    "pen_ink"
    "pencil"
    "photorealistic"
    "pixel_art"
    "polished"
    "pop_art"
    "renaissance"
    "scandinavian_folk"
    "sepia_tone"
    "serene"
    "silhouette"
    "sketchy"
    "smoke"
    "stained_glass"
    "surrealist"
    "tempera"
    "textured"
    "underwater"
    "vaporwave"
    "vector_art"
    "vintage"
    "watercolor"
    "watercolor_ink"
    "whimsical"
    "wood_grain"
)

TOTAL=${#STYLES[@]}
FOUND=0
MISSING=0
ERRORS=0

# Arrays to track results
declare -a FOUND_STYLES=()
declare -a MISSING_STYLES=()
declare -a ERROR_STYLES=()

echo "Checking $TOTAL style assets..."
echo ""

# Check each asset
for style in "${STYLES[@]}"; do
    filename="${style}.png"
    url="${BASE_URL}${ASSET_PATH}/${filename}"
    
    # Try to fetch the asset (HEAD request to check existence without downloading)
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅${NC} $filename"
        ((FOUND++))
        FOUND_STYLES+=("$style")
    elif [ "$http_code" = "404" ]; then
        echo -e "${RED}❌${NC} $filename (404 Not Found)"
        ((MISSING++))
        MISSING_STYLES+=("$style")
    elif [ "$http_code" = "000" ]; then
        echo -e "${YELLOW}⚠️${NC} $filename (Connection Error)"
        ((ERRORS++))
        ERROR_STYLES+=("$style")
    else
        echo -e "${YELLOW}⚠️${NC} $filename (HTTP $http_code)"
        ((ERRORS++))
        ERROR_STYLES+=("$style")
    fi
done

echo ""
echo "===================================="
echo "📊 Verification Summary"
echo "===================================="
echo -e "Total Styles: ${BLUE}$TOTAL${NC}"
echo -e "Found: ${GREEN}$FOUND${NC}"
echo -e "Missing: ${RED}$MISSING${NC}"
echo -e "Errors: ${YELLOW}$ERRORS${NC}"
echo ""

# Detailed reports
if [ ${#MISSING_STYLES[@]} -gt 0 ]; then
    echo -e "${RED}Missing Assets:${NC}"
    for style in "${MISSING_STYLES[@]}"; do
        echo "  - ${style}.png"
    done
    echo ""
fi

if [ ${#ERROR_STYLES[@]} -gt 0 ]; then
    echo -e "${YELLOW}Assets with Errors:${NC}"
    for style in "${ERROR_STYLES[@]}"; do
        echo "  - ${style}.png"
    done
    echo ""
fi

# Check API endpoint
echo "Checking API endpoint..."
API_URL="${BASE_URL}/api/assets/styles"
api_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API_URL" 2>/dev/null || echo "000")

if [ "$api_code" = "200" ]; then
    echo -e "${GREEN}✅${NC} API endpoint accessible: $API_URL"
    echo "Fetching API response..."
    curl -s "$API_URL" | jq '.' 2>/dev/null || echo "  (Response received but not valid JSON)"
elif [ "$api_code" = "404" ]; then
    echo -e "${YELLOW}⚠️${NC} API endpoint not found: $API_URL"
    echo "  (This is expected if assets API hasn't been set up yet)"
else
    echo -e "${YELLOW}⚠️${NC} API endpoint error (HTTP $api_code): $API_URL"
fi

echo ""
echo "===================================="

# Exit code
if [ $MISSING -eq 0 ] && [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All assets verified successfully!${NC}"
    exit 0
elif [ $MISSING -gt 0 ]; then
    echo -e "${RED}❌ Some assets are missing${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️ Some assets had errors${NC}"
    exit 2
fi
