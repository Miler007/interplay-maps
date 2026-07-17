#!/bin/bash
set -e

# ============================================================
# Deploy Interplay Maps to VPS (DigitalOcean / Linode / Vultr)
# ============================================================
# Prerequisites:
#   1. A VPS with Docker and Docker Compose installed
#   2. DNS A record pointing to the VPS IP
#   3. GitHub secrets configured:
#      - VPS_HOST, VPS_USER, VPS_SSH_KEY
#      - DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
# ============================================================

REPO="https://github.com/YOUR_ORG/interplay-maps"
DEPLOY_DIR="/opt/interplay-maps"

echo "=== Interplay Maps Deploy ==="

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
fi

# Create deploy directory
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# Clone or pull latest
if [ -d "$DEPLOY_DIR/.git" ]; then
  echo "Updating repository..."
  cd $DEPLOY_DIR && git pull
else
  echo "Cloning repository..."
  git clone $REPO $DEPLOY_DIR
fi

cd $DEPLOY_DIR

# Create .env if missing
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << 'ENVEOF'
DB_PASSWORD=changeme
JWT_SECRET=generate-with-openssl-rand-hex-32
JWT_REFRESH_SECRET=generate-with-openssl-rand-hex-32
CORS_ORIGIN=https://interplay-maps.pages.dev
ENVEOF
  echo "⚠️  Edit .env with your secrets before continuing!"
  exit 1
fi

# Start services
echo "Starting services..."
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Verify
echo "Waiting for backend..."
sleep 5
curl -s http://localhost:4000/api/v1/dashboard || echo "⚠️  Backend not responding yet, check logs: docker compose logs"

echo "=== Deploy complete ==="
echo "Backend: http://localhost:4000"
echo "Health:  http://localhost:4000/api/v1/dashboard"
echo ""
echo "Next steps:"
echo "  1. Configure Nginx reverse proxy with SSL (certbot)"
echo "  2. Set DNS A record -> VPS IP"
echo "  3. Update CORS_ORIGIN in .env"
echo "  4. Run: docker compose logs -f"
