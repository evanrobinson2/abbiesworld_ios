#!/bin/bash
# Upload all images to Cloudflare R2

set -e

BUCKET="rome-history-assets"
ACCOUNT_ID="3226e035c229fd7a66c24a77ac834040"
PUBLIC_URL="https://pub-64dda63c980745779da5e16c2ec14f70.r2.dev"

export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_KEY"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

cd /workspace

# Find all images and upload
find assets -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" \) | while read -r file; do
  # Get the path relative to assets for the R2 key
  key="${file#assets/}"
  echo "Uploading: $key"
  npx wrangler r2 object put "$BUCKET/$key" --file "$file" --content-type "image/png" 2>/dev/null
done

echo ""
echo "Done! Images available at: $PUBLIC_URL"
