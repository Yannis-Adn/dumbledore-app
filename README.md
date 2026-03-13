# Dumbledore

Frontend moderne pour les plateformes **Gandalf** (Moodle) et **Panoramix** (calendrier) d'Epitech, avec **notifications push mobiles** (deadlines, nouveaux projets) et **récupération automatique des tokens** via l'extension navigateur.
Les utilisateurs collent leur cookie `MoodleSession` et leur JWT `Panoramix` pour s'authentifier (ou laissent l'extension le faire). Pas de compte, pas de backend d'auth.

## Stack

| Couche | Tech |
|--------|------|
| Frontend | React 19, TypeScript, TailwindCSS v4, Vite |
| Backend / Proxy | Express 5, http-proxy-middleware, node-cron |
| Notifications | Redis (stockage tokens), ntfy.sh (push mobile) |
| Infra | Docker Compose (nginx + backend + redis) |
| Production | VM Ubuntu, déployé via `rsync` + SSH |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  nginx :80                  │
│  ┌───────────┐  ┌─────────────────────────┐ │
│  │ SPA static│  │ reverse proxy           │ │
│  │ app/dist  │  │ /api/* → backend        │ │
│  │           │  │ /panoramix-api/* → back. │ │
│  └───────────┘  └──────────┬──────────────┘ │
└────────────────────────────┼────────────────┘
                             │
┌────────────────────────────▼────────────────┐
│              backend :3000                  │
│  Express (proxy Gandalf + Panoramix + API)  │
│  + cron jobs (check-deadlines)              │
│  + Redis (token storage pour notifs)        │
└─────────────────────────────────────────────┘
```

- **nginx** sert le build statique React (`app/dist`) et reverse-proxy les requetes API vers le backend Express.
- **backend** fait le proxy CORS vers Gandalf (Moodle) et Panoramix, gère les endpoints de notifications push, et tourne un cron pour checker les deadlines.
- **redis** stocke les tokens des users pour les notifications push (cron).

En dev, Vite remplace nginx + le proxy backend : le hot-reload fonctionne directement.

## Prerequis

- Node.js >= 20
- Docker & Docker Compose
- (Prod) Acces SSH a la VM

## Installation

```bash
# Cloner le repo
git clone <repo-url> && cd Dumbledore

# Installer les deps (frontend + backend)
make install

# Copier le fichier d'env
cp .env.example .env
```

## Dev (local, sans Docker)

```bash
make dev
```

Lance Vite sur `localhost:5173` avec hot-reload. Le proxy CORS est geré par Vite directement (`vite.config.ts`), pas besoin de Docker.

## Docker (local, mode production-like)

```bash
# Build le frontend + demarre les 3 containers
make up

# Ou sans rebuild le front (si app/dist est deja a jour)
make up-quick
```

L'app tourne sur `localhost:3000`.

```bash
# Voir les logs
make logs

# Logs d'un service specifique
make logs-svc SVC=backend

# Restart un service
make restart SVC=backend

# Tout arreter
make down

# Nettoyage complet (volumes + images)
make clean
```

## Mise en production

### Setup initial (une seule fois)

```bash
# Installe Docker sur la VM et cree le repertoire du projet
make setup
```

La VM cible est configuree dans `.deploy.env` (voir `.deploy.env.example`) :
- **Host** : `VM_HOST`
- **Port SSH** : `VM_PORT`
- **Repertoire** : `REMOTE_DIR`

### Deployer

```bash
make deploy
```

Ce que `deploy.sh` fait :
1. Build le frontend localement (`app/dist`)
2. `rsync` tout le projet sur la VM (sans node_modules, .git, etc.)
3. `docker compose up -d --build` sur la VM

L'app est live sur **https://<tn-adresse>**

### Config serveur

Le `.env` sur la VM contient :
```bash
# Redis utilise le reseau Docker interne par defaut
# REDIS_URL=redis://redis:6379

# Proteger l'endpoint check-deadlines
# CRON_SECRET=
```

## Commandes utiles (Makefile)

| Commande | Description |
|----------|-------------|
| `make dev` | Dev local avec Vite (hot-reload, port 5173) |
| `make build` | Build frontend (type-check + vite build) |
| `make lint` | ESLint sur le frontend |
| `make typecheck` | Type-check TypeScript sans build |
| `make install` | Install deps frontend + backend |
| `make up` | Build front + start Docker |
| `make up-quick` | Start Docker sans rebuild front |
| `make up-build` | Build front + rebuild image backend + start |
| `make down` | Stop tous les containers |
| `make logs` | Logs de tous les services |
| `make clean` | Stop + supprime volumes et images |
| `make deploy` | Deploy en prod (build + rsync + docker) |
| `make setup` | Setup initial de la VM |
| `make pack-extensions` | Package les extensions navigateur |

## Structure du projet

```
Dumbledore/
├── app/                    # Frontend React
│   ├── src/
│   │   ├── components/     # Composants reutilisables
│   │   ├── pages/          # Pages (routes)
│   │   ├── context/        # React Context (auth, theme)
│   │   ├── lib/            # API clients (Gandalf, Panoramix, ntfy)
│   │   └── index.css       # Tailwind + design tokens
│   ├── public/             # Assets statiques
│   └── vite.config.ts      # Config Vite + proxy dev
├── server/                 # Backend Express
│   └── src/
│       ├── index.ts        # Entry point
│       ├── proxy.ts        # Proxy Gandalf + Panoramix
│       ├── cron.ts         # Cron jobs
│       ├── routes/         # API endpoints (notifs)
│       └── lib/            # Utils server (store, ntfy, panoramix)
├── nginx/
│   └── nginx.conf          # Config nginx (reverse proxy)
├── extension/              # Extensions navigateur (Chrome + Firefox)
├── docker-compose.yml      # Orchestration (nginx + backend + redis)
├── deploy.sh               # Script de deploiement prod
├── setup.sh                # Setup initial VM
├── Makefile                # Toutes les commandes
└── docs/                   # Documentation detaillee
    ├── API.md              # Reference API Moodle
    ├── PANORAMIX_API.md    # Reference API Panoramix
    ├── STYLE_GUIDE.md      # Tokens, composants, dark mode
    ├── ARCHITECTURE.md     # Architecture, auth, proxy, state
    ├── DEPLOYMENT.md       # Deploiement Docker self-hosted
    └── PUSH_NOTIFICATIONS.md  # Notifications push (ntfy.sh)
```
