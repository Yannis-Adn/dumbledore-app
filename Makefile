# ── Dumbledore ──────────────────────────────────────────────

# Dev (frontend hot-reload avec Vite proxy)
dev:
	cd app && npm run dev

# Build frontend
build:
	cd app && npm run build

# Lint frontend
lint:
	cd app && npm run lint

# Type-check frontend
typecheck:
	cd app && npx tsc --noEmit

# Install all dependencies (frontend + backend)
install:
	cd app && npm install
	cd server && npm install

# ── Docker ──────────────────────────────────────────────────

# Start all containers (build frontend first)
up: build
	docker compose up -d

# Start containers without rebuilding frontend
up-quick:
	docker compose up -d

# Rebuild backend image and restart
up-build: build
	docker compose up -d --build

# Stop all containers
down:
	docker compose down

# View logs (all services)
logs:
	docker compose logs -f

# View logs (specific service: make logs-svc SVC=nginx)
logs-svc:
	docker compose logs -f $(SVC)

# Restart a specific service: make restart SVC=backend
restart:
	docker compose restart $(SVC)

# Stop, rebuild (frontend + backend image) and restart
reup: build
	docker compose down
	docker compose up -d --build

# Full clean (containers + volumes + images)
clean:
	docker compose down -v --rmi local

# ── Production (VM) ─────────────────────────────────────────

# Deploy to production VM
deploy:
	./deploy.sh

# Initial VM setup (run once)
setup:
	./setup.sh

# ── Extensions ──────────────────────────────────────────────

# Package browser extensions
pack-extensions:
	cd app && npm run pack-extensions

.PHONY: dev build lint typecheck install up up-quick up-build reup down logs logs-svc restart clean deploy setup pack-extensions
