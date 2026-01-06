#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

log() { printf "[run.sh] %s\n" "$*"; }
warn() { printf "[run.sh] WARNING: %s\n" "$*" >&2; }

die() {
  printf "[run.sh] ERROR: %s\n" "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  ./run.sh [dev|prod] [--push|--migrate] [--seed] [--] [extra args...]

What it does:
  - Installs npm dependencies if needed
  - Runs Prisma client generation (safe)
  - Optionally sets up the database (push/migrate) if DATABASE_URL is set
  - Starts the app:
      dev  -> npm run dev
      prod -> npm run build && npm run preview

Options:
  --push     Run `npm run db:push` (requires DATABASE_URL)
  --migrate  Run `npm run db:migrate` (requires DATABASE_URL)
  --seed     Run `npx prisma db seed` after push/migrate
  --         Pass remaining args to the underlying npm command

Environment:
  LOAD_ENV=1     Source ./.env before running (default: 1 if .env exists)
  PORT=####      Passed through to Vite (and used for preview where applicable)
EOF
}

MODE="dev"
DO_PUSH=0
DO_MIGRATE=0
DO_SEED=0
PASS_THROUGH=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    dev|prod)
      MODE="$1"
      shift
      ;;
    --push)
      DO_PUSH=1
      shift
      ;;
    --migrate)
      DO_MIGRATE=1
      shift
      ;;
    --seed)
      DO_SEED=1
      shift
      ;;
    --)
      shift
      PASS_THROUGH+=("$@")
      break
      ;;
    *)
      PASS_THROUGH+=("$1")
      shift
      ;;
  esac
done

if [[ "$DO_PUSH" -eq 1 && "$DO_MIGRATE" -eq 1 ]]; then
  die "Choose only one of --push or --migrate"
fi

# Optionally source .env (best-effort)
if [[ "${LOAD_ENV:-}" != "0" && -f .env ]]; then
  log "Loading .env (set LOAD_ENV=0 to disable)"
  set +u
  set -a
  # shellcheck disable=SC1091
  source .env || warn "Failed to source .env (continuing)"
  set +a
  set -u
fi

command -v npm >/dev/null 2>&1 || die "npm not found on PATH"

# Install deps if missing
if [[ ! -d node_modules ]]; then
  log "node_modules missing; installing dependencies"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
else
  log "Dependencies already present (node_modules exists)"
fi

# Prisma client generation is safe and fast-ish
if [[ -d prisma && -f prisma/schema.prisma ]]; then
  log "Generating Prisma client"
  npm run -s db:generate || die "Prisma generate failed"

  if [[ "$DO_PUSH" -eq 1 || "$DO_MIGRATE" -eq 1 || "$DO_SEED" -eq 1 ]]; then
    if [[ -z "${DATABASE_URL:-}" ]]; then
      die "DATABASE_URL is not set (required for --push/--migrate/--seed)"
    fi

    if [[ "$DO_MIGRATE" -eq 1 ]]; then
      log "Running database migrations (dev)"
      npm run -s db:migrate
    elif [[ "$DO_PUSH" -eq 1 ]]; then
      log "Pushing Prisma schema to database"
      npm run -s db:push
    fi

    if [[ "$DO_SEED" -eq 1 ]]; then
      log "Seeding database"
      npx prisma db seed
    fi
  fi
else
  log "No Prisma schema found; skipping Prisma steps"
fi

case "$MODE" in
  dev)
    log "Starting dev server"
    npm run dev -- "${PASS_THROUGH[@]}"
    ;;
  prod)
    log "Building"
    npm run build
    log "Starting preview server"
    npm run preview -- "${PASS_THROUGH[@]}"
    ;;
  *)
    die "Unknown mode: $MODE"
    ;;
esac
