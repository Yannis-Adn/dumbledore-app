# Push Notifications — Guide d'installation

Dumbledore envoie des notifications push sur ton téléphone pour te prévenir de tes événements à venir (cours, follow-ups, soutenances...) via **ntfy.sh**, un service open-source gratuit.

Chaque utilisateur a son propre canal personnel et peut configurer jusqu'à **3 rappels** avec des délais différents.

---

## Installation rapide (2 minutes)

### 1. Télécharge l'app ntfy

| Plateforme | Lien |
|------------|------|
| **iOS** | [App Store](https://apps.apple.com/app/ntfy/id1625396347) |
| **Android** | [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) |
| **Desktop** | [ntfy.sh/app](https://ntfy.sh/app) (web app) |

### 2. Active les notifications dans Dumbledore

1. Connecte-toi à Dumbledore
2. Clique sur ton avatar (en haut à droite) → **Push Notifications**
3. Tu verras un **QR code** et un **code personnel** généré pour toi

### 3. Abonne-toi

**Option A — QR code (recommandé) :**
1. Ouvre l'appareil photo de ton téléphone
2. Scanne le QR code affiché dans Dumbledore
3. L'app ntfy s'ouvre et te propose de t'abonner → confirme

**Option B — Manuellement :**
1. Ouvre l'app ntfy sur ton téléphone
2. Appuie sur **"+"** (ajouter un abonnement)
3. Colle le code personnel affiché dans Dumbledore (ex: `dumbledore-john-doe-x4k7`)
4. Appuie sur **"Subscribe"**

### 4. Active et teste

1. Dans Dumbledore, clique **"Activer les notifications push"**
2. Clique **"Envoyer une notification test"**
3. Tu devrais recevoir une notification sur ton téléphone dans les secondes

### 5. Configure tes rappels

Par défaut, tu recevras 3 rappels par événement :
- **24 heures** avant
- **1 heure** avant
- **5 minutes** avant

Tu peux modifier ces délais dans la section "Rappels" (max 3 rappels).
Options disponibles : 5min, 15min, 30min, 1h, 2h, 6h, 12h, 24h, 48h.

---

## Comment ça marche

### Topics individuels

Chaque utilisateur reçoit un code ntfy unique : `dumbledore-{prenom}-{nom}-{random}`.
C'est ton canal personnel — seul toi reçois tes notifications dessus.

### Backend

Un cron job tourne 3x/jour (7h, 12h, 18h UTC) et :
1. Groupe les utilisateurs par promo (cohort)
2. Utilise UN token valide par promo pour vérifier l'emploi du temps Panoramix
3. Pour chaque utilisateur, envoie les rappels selon SES préférences

### Tokens et rafraîchissement

Le système a besoin d'au moins **un token Panoramix valide** par promo pour vérifier l'emploi du temps. Les tokens durent ~7 jours.

**Il suffit qu'un seul membre de la promo ouvre Dumbledore une fois par semaine.**

Si tous les tokens expirent, une notification spéciale est envoyée :
> "Tous les tokens de ta promo sont expirés. Ouvre Dumbledore pour les rafraîchir."

---

## FAQ

### C'est gratuit ?
Oui, 100%. ntfy.sh est open-source. Limite : ~250 messages/jour/IP pour le serveur public, largement suffisant.

### C'est sécurisé ?
Chaque topic utilise un suffixe aléatoire — personne ne peut deviner ton code. Et même si quelqu'un s'abonnait, il ne verrait que les titres de tes événements (pas de données personnelles).

### Le QR code ne s'ouvre pas dans ntfy ?
Le QR encode un lien `ntfy://ntfy.sh/<topic>`. Si ça ne marche pas :
- Vérifie que l'app ntfy est installée
- Copie le code manuellement et entre-le dans ntfy

### Je reçois pas la notification de test ?
- Vérifie que tu as le bon topic dans ntfy
- Vérifie les permissions de notifications sur ton téléphone (Réglages → ntfy → Notifications)
- Sur iOS, les notifs peuvent prendre quelques secondes

### Je veux changer mes rappels ?
Va dans avatar → Push Notifications → section "Rappels". Les changements sont sauvegardés automatiquement.

---

## Architecture technique

```
Dumbledore (Frontend)
├── /push-notifications          Page setup + QR code + rappels
├── lib/ntfy.ts                  Client ntfy (topic gen, QR URL, test notif)
└── context/auth.tsx             Auto-refresh du token en background

Server (Express)
├── routes/register-notif.ts     Enregistrement d'un user + préférences
├── routes/refresh-notif-token.ts  Mise à jour du token + rappels
├── routes/check-deadlines.ts    Cron job (3x/jour) — par user, par rappel
├── lib/panoramix-server.ts      Client Panoramix côté serveur
├── lib/ntfy-server.ts           Envoi de notifications
└── lib/store.ts                 Abstraction Redis

Stockage (Redis)
├── notif:user:<userId>                            Token + topic + rappels
├── notif:cohort:<cohortKey>                       Set d'IDs users par promo
└── notif:sent:<topicId>:<eventId>:<reminderMin>   Dédup (TTL 48h)
```
