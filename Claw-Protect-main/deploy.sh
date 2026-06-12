#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Claw Protect — Autonomous Deployment Script
# Usage:
#   ./deploy.sh railway      → deploy to Railway (recommended, cheapest)
#   ./deploy.sh render       → deploy to Render
#   ./deploy.sh docker       → build & run locally via Docker
#   ./deploy.sh fly          → deploy to Fly.io
#   ./deploy.sh setup-stripe → one-time Stripe product/price creation
#   ./deploy.sh health       → check health of running deployment
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="claw-protect"
DEFAULT_PORT=3003

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[CLAW]${RESET} $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()  { echo -e "${RED}[ERR]${RESET} $*"; exit 1; }

banner() {
  echo -e "${BOLD}${CYAN}"
  echo "  ╔═══════════════════════════════════════════╗"
  echo "  ║         CLAW PROTECT — DEPLOY             ║"
  echo "  ║   AI Agent Security SaaS Platform         ║"
  echo "  ╚═══════════════════════════════════════════╝"
  echo -e "${RESET}"
}

# ── Preflight checks ─────────────────────────────────────────────────────────
check_env() {
  log "Checking environment..."
  [[ -f "$SCRIPT_DIR/.env" ]] || warn ".env not found — using .env.production.example as reference"
  
  if [[ -f "$SCRIPT_DIR/.env" ]]; then
    source "$SCRIPT_DIR/.env" 2>/dev/null || true
  fi

  [[ -z "${STRIPE_SECRET_KEY:-}" ]] && warn "STRIPE_SECRET_KEY not set — Stripe billing will not work"
  [[ -z "${CLAW_STRIPE_WEBHOOK_SECRET:-}" ]] && warn "CLAW_STRIPE_WEBHOOK_SECRET not set"
  [[ -z "${GEMINI_API_KEY:-}" ]] && warn "GEMINI_API_KEY not set — AI modules will use fallback"
  ok "Environment check complete"
}

# ── Build frontend ────────────────────────────────────────────────────────────
build_frontend() {
  log "Building React SPA..."
  cd "$SCRIPT_DIR"
  npm ci --ignore-scripts
  npm run build
  [[ -f "dist/index.html" ]] || err "Vite build failed — dist/index.html missing"
  ok "Frontend built → dist/"
}

# ── Railway ───────────────────────────────────────────────────────────────────
deploy_railway() {
  log "Deploying to Railway..."
  command -v railway &>/dev/null || err "Railway CLI not found. Install: npm i -g @railway/cli && railway login"
  
  cd "$SCRIPT_DIR"
  
  # Link project if not already linked
  if ! railway status &>/dev/null; then
    log "Linking Railway project..."
    railway init --name "$APP_NAME" || railway link
  fi

  # Set required env vars in Railway
  log "Syncing environment variables to Railway..."
  [[ -n "${STRIPE_SECRET_KEY:-}" ]]              && railway variables set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
  [[ -n "${CLAW_STRIPE_WEBHOOK_SECRET:-}" ]]      && railway variables set CLAW_STRIPE_WEBHOOK_SECRET="$CLAW_STRIPE_WEBHOOK_SECRET"
  [[ -n "${GEMINI_API_KEY:-}" ]]                  && railway variables set GEMINI_API_KEY="$GEMINI_API_KEY"
  [[ -n "${CLAW_SUCCESS_URL:-}" ]]                && railway variables set CLAW_SUCCESS_URL="$CLAW_SUCCESS_URL"
  [[ -n "${CLAW_CANCEL_URL:-}" ]]                 && railway variables set CLAW_CANCEL_URL="$CLAW_CANCEL_URL"
  railway variables set NODE_ENV=production
  railway variables set CLAW_PORT=3000

  # Deploy
  railway up --detach
  
  # Get the public URL
  sleep 5
  DEPLOY_URL=$(railway domain 2>/dev/null || echo "check Railway dashboard")
  ok "Deployed to Railway!"
  echo -e "${BOLD}  URL: https://${DEPLOY_URL}${RESET}"
  echo -e "  Health: https://${DEPLOY_URL}/api/health"
  echo ""
  warn "NEXT: Set Stripe webhook endpoint in dashboard:"
  warn "  https://${DEPLOY_URL}/api/v1/stripe/webhook"
  warn "  Events: checkout.session.completed, customer.subscription.deleted"
}

# ── Render ────────────────────────────────────────────────────────────────────
deploy_render() {
  log "Deploying to Render via render.yaml..."
  command -v render &>/dev/null || err "Render CLI not found. Install: npm i -g @render-oss/cli && render login"
  
  # render.yaml is at the BlackMind-main root (one level up)
  RENDER_CONFIG="$(dirname "$SCRIPT_DIR")/render.yaml"
  [[ -f "$RENDER_CONFIG" ]] || err "render.yaml not found at $RENDER_CONFIG"
  
  render blueprint apply --file "$RENDER_CONFIG" --yes
  ok "Render deployment triggered"
  warn "Check https://dashboard.render.com for deployment status"
}

# ── Docker (local) ────────────────────────────────────────────────────────────
deploy_docker() {
  log "Building and starting Docker container..."
  command -v docker &>/dev/null || err "Docker not found — install Docker Desktop"
  
  cd "$SCRIPT_DIR"
  
  # Build
  docker build -t "$APP_NAME:latest" .
  ok "Docker image built: ${APP_NAME}:latest"
  
  # Stop any existing container
  docker rm -f "$APP_NAME" 2>/dev/null || true
  
  # Run with env vars
  docker run -d \
    --name "$APP_NAME" \
    --restart unless-stopped \
    -p "${CLAW_PORT:-$DEFAULT_PORT}:3000" \
    -v "claw-protect-data:/app/data" \
    -e NODE_ENV=production \
    -e CLAW_PORT=3000 \
    ${STRIPE_SECRET_KEY:+-e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"} \
    ${CLAW_STRIPE_WEBHOOK_SECRET:+-e CLAW_STRIPE_WEBHOOK_SECRET="$CLAW_STRIPE_WEBHOOK_SECRET"} \
    ${GEMINI_API_KEY:+-e GEMINI_API_KEY="$GEMINI_API_KEY"} \
    ${CLAW_SUCCESS_URL:+-e CLAW_SUCCESS_URL="$CLAW_SUCCESS_URL"} \
    ${CLAW_CANCEL_URL:+-e CLAW_CANCEL_URL="$CLAW_CANCEL_URL"} \
    -e APP_URL="${APP_URL:-http://localhost:${CLAW_PORT:-$DEFAULT_PORT}}" \
    "$APP_NAME:latest"

  ok "Container started on port ${CLAW_PORT:-$DEFAULT_PORT}"
  echo -e "${BOLD}  API: http://localhost:${CLAW_PORT:-$DEFAULT_PORT}/api/health${RESET}"
  
  # Tail logs briefly
  sleep 3
  docker logs "$APP_NAME" --tail 20
}

# ── Fly.io ────────────────────────────────────────────────────────────────────
deploy_fly() {
  log "Deploying to Fly.io..."
  command -v fly &>/dev/null || err "flyctl not found. Install: https://fly.io/docs/hands-on/install-flyctl/"
  
  cd "$SCRIPT_DIR"
  
  # Create fly.toml if it doesn't exist
  if [[ ! -f "fly.toml" ]]; then
    log "Creating fly.toml..."
    cat > fly.toml <<FLYTOML
app = "claw-protect"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

[mounts]
  source = "claw_data"
  destination = "/app/data"

[[services.http_checks]]
  interval = "30s"
  timeout = "10s"
  path = "/api/health"
FLYTOML
    ok "fly.toml created"
  fi

  # Launch or deploy
  if fly status &>/dev/null; then
    fly deploy
  else
    fly launch --name "$APP_NAME" --no-deploy
    # Set secrets
    [[ -n "${STRIPE_SECRET_KEY:-}" ]]             && fly secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
    [[ -n "${CLAW_STRIPE_WEBHOOK_SECRET:-}" ]]     && fly secrets set CLAW_STRIPE_WEBHOOK_SECRET="$CLAW_STRIPE_WEBHOOK_SECRET"
    [[ -n "${GEMINI_API_KEY:-}" ]]                 && fly secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
    fly deploy
  fi
  
  DEPLOY_URL="$(fly status --json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Hostname',''))" 2>/dev/null || echo 'fly dashboard')"
  ok "Deployed to Fly.io!"
  echo -e "${BOLD}  URL: https://${DEPLOY_URL}${RESET}"
}

# ── Stripe setup (one-time) ───────────────────────────────────────────────────
setup_stripe() {
  BASE_URL="${APP_URL:-http://localhost:${CLAW_PORT:-$DEFAULT_PORT}}"
  log "Setting up Stripe products at $BASE_URL..."
  
  RESPONSE=$(curl -sf -X POST "$BASE_URL/api/v1/stripe/setup" \
    -H "Content-Type: application/json" 2>&1) || {
    err "Stripe setup request failed — is the server running at $BASE_URL?"
  }
  
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  ok "Stripe products created — IDs saved to data/stripe-products.json"
  warn "Copy the webhook endpoint to Stripe dashboard:"
  warn "  $BASE_URL/api/v1/stripe/webhook"
}

# ── Health check ──────────────────────────────────────────────────────────────
check_health() {
  BASE_URL="${APP_URL:-http://localhost:${CLAW_PORT:-$DEFAULT_PORT}}"
  log "Checking health at $BASE_URL..."
  
  HEALTH=$(curl -sf "$BASE_URL/api/health" 2>&1) || err "Health check failed — server not responding"
  echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
  
  STRIPE=$(curl -sf "$BASE_URL/api/v1/stripe/status" 2>&1) || warn "Stripe status unavailable"
  [[ -n "${STRIPE:-}" ]] && (echo "$STRIPE" | python3 -m json.tool 2>/dev/null || echo "$STRIPE")
  
  ok "System healthy"
}

# ── Entrypoint ────────────────────────────────────────────────────────────────
banner
check_env

COMMAND="${1:-help}"

case "$COMMAND" in
  railway)       deploy_railway ;;
  render)        deploy_render ;;
  docker)        deploy_docker ;;
  fly)           deploy_fly ;;
  setup-stripe)  setup_stripe ;;
  health)        check_health ;;
  build)         build_frontend ;;
  *)
    echo "Usage: $0 <command>"
    echo ""
    echo "  railway      Deploy to Railway (recommended)"
    echo "  render       Deploy to Render"
    echo "  docker       Build & run via Docker locally"
    echo "  fly          Deploy to Fly.io"
    echo "  setup-stripe One-time Stripe product creation"
    echo "  health       Check health of running deployment"
    echo "  build        Build React frontend only"
    echo ""
    echo "Set env vars in .env or export before running."
    ;;
esac
