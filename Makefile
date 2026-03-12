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

# Sync code to public GitHub repo (without deploying)
sync-public:
	@SCRIPT_DIR="$$(pwd)"; \
	PUBLIC_REPO="git@github.com:Yannis-Adn/dumbledore-app.git"; \
	SYNC_DIR=$$(mktemp -d); \
	trap "rm -rf '$$SYNC_DIR'" EXIT; \
	echo "==> Cloning public repo..."; \
	git clone --depth 1 "$$PUBLIC_REPO" "$$SYNC_DIR" 2>/dev/null; \
	(cd "$$SYNC_DIR" && git rm -rf . > /dev/null 2>&1) || true; \
	git archive HEAD | tar -x -C "$$SYNC_DIR"; \
	rm -f "$$SYNC_DIR/.deploy.env" "$$SYNC_DIR/.mcp.json"; \
	rm -rf "$$SYNC_DIR/.claude"; \
	(cd "$$SYNC_DIR" && git add -A); \
	if (cd "$$SYNC_DIR" && git diff --cached --quiet); then \
		echo "    Public repo already up to date."; \
	else \
		(cd "$$SYNC_DIR" && git commit -m "Sync $$(git -C "$$SCRIPT_DIR" log -1 --format='%h — %s')"); \
		(cd "$$SYNC_DIR" && git push origin main); \
		echo "    Public repo updated."; \
	fi

# ── Extensions ──────────────────────────────────────────────

# Package browser extensions
pack-extensions:
	cd app && npm run pack-extensions

.PHONY: dev build lint typecheck install up up-quick up-build reup down logs logs-svc restart clean deploy setup sync-public pack-extensions
