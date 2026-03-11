# Deployment (Self-Hosted)

## Architecture

```
            <YOUR_DOMAIN>
                       |
                  Port 3000
                       |
┌──────────────────────┴──────────────────────┐
│                   Docker                     │
│                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  nginx   │───>│ backend │───>│  redis  │  │
│  │ (proxy)  │    │(Express)│    │ (store) │  │
│  └─────────┘    └─────────┘    └─────────┘  │
│   :80→:3000      API proxys     KV storage   │
│   sert le        + cron notifs  persistant   │
│   frontend                                   │
└─────────────────────────────────────────────┘
```

**3 containers :**

| Container | Image | Rôle |
|-----------|-------|------|
| `nginx` | `nginx:alpine` | Reverse proxy, sert le frontend statique (`app/dist`), redirige `/api/*` vers le backend |
| `backend` | Build custom (`./server`) | Proxy Express vers Gandalf + Panoramix, cron notifications push |
| `redis` | `redis:7-alpine` | Stockage des inscriptions notifications (persistance AOF, max 256 Mo) |

## Serveur

- **OS** : Ubuntu 24.04
- **Docker** : v29
- **Accès SSH** : `ssh -p <VM_PORT> <VM_USER>@<VM_HOST>`
- **Port exposé** : 3000 → `https://<YOUR_DOMAIN>`
- **Répertoire** : `<REMOTE_DIR>`

## Structure sur le serveur

```
<REMOTE_DIR>/
├── docker-compose.yml
├── .env                    # Variables d'environnement (non synced)
├── app/
│   └── dist/               # Frontend buildé (monté dans nginx)
├── server/                 # Code source backend + Dockerfile
├── nginx/
│   └── nginx.conf          # Config nginx
└── docs/
```

## Déployer

```bash
./deploy.sh
```

Ce script fait 3 choses :
1. Build le frontend localement (`npm run build`)
2. Rsync les fichiers vers la VM (exclut `node_modules`, `.git`, `.env`, etc.)
3. `docker compose up -d --build` sur la VM

Le `.env` sur le serveur n'est **jamais écrasé** par le déploiement.

## Commandes utiles

Se connecter à la VM :

```bash
ssh -p <VM_PORT> <VM_USER>@<VM_HOST>
cd <REMOTE_DIR>
```

### Logs

```bash
# Tous les logs
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f redis

# Dernières 100 lignes
docker compose logs --tail=100 backend
```

### Gestion des containers

```bash
# Statut
docker compose ps

# Redémarrer tout
docker compose restart

# Redémarrer un service
docker compose restart backend

# Rebuild + restart (après modif du code backend)
docker compose up -d --build backend

# Tout arrêter
docker compose down

# Tout arrêter + supprimer les volumes (reset Redis)
docker compose down -v

# Rebuild complet from scratch
docker compose down && docker compose up -d --build
```

### Debug

```bash
# Shell dans un container
docker compose exec backend sh
docker compose exec nginx sh
docker compose exec redis sh

# Vérifier que Redis fonctionne
docker compose exec redis redis-cli ping
# → PONG

# Voir les clés stockées dans Redis
docker compose exec redis redis-cli keys '*'
```
