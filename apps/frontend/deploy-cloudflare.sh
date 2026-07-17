#!/bin/bash
# Deploy Interplay Maps frontend to Cloudflare Pages
# Requisito: wrangler login o CLOUDFLARE_API_TOKEN

set -e

echo "=== 1. Construir shared package ==="
cd ../..
cd packages/shared
npm run build
cd ../..

echo "=== 2. Build frontend ==="
cd apps/frontend
npm run build

echo "=== 3. Deploy a Cloudflare Pages ==="
npx wrangler pages deploy out --project-name=interplay-maps

echo "=== 4. Done! ==="
