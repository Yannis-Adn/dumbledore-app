# Dumbledore Token Sync — Extension Chrome

Extension Manifest V3 qui capture automatiquement tes tokens Gandalf et Panoramix dès que tu visites les sites, et les injecte directement dans Dumbledore.

## Installation (mode développeur)

1. Ouvre Chrome et va sur `chrome://extensions`
2. Active le **Mode développeur** (toggle en haut à droite)
3. Clique sur **"Charger l'extension non empaquetée"**
4. Sélectionne le dossier `extension/` de ce repo
5. L'extension apparaît dans ta barre d'outils (icône 🧙‍♂️)

> Fonctionne aussi sur **Arc**, **Brave**, **Edge** (même procédure).

---

## Comment ça marche

### Capture automatique
L'extension écoute les cookies en temps réel via `chrome.cookies.onChanged`.

- Dès que tu te connectes sur **gandalf.epitech.eu** → `MoodleSession` est capturé instantanément
- Dès que tu te connectes sur **panoramix.epitest.eu** → `refresh_token` est capturé instantanément
- Les tokens sont stockés dans `chrome.storage.local` (local à ton navigateur, jamais envoyé nulle part)

### Injection dans Dumbledore
Quand tu ouvres Dumbledore (`localhost:*`), l'extension :
1. Compare les tokens stockés avec ceux dans le `localStorage` de l'app
2. Si différents → met à jour le `localStorage` et recharge la page
3. L'app s'authentifie automatiquement avec les nouveaux tokens

### Popup
Clique sur l'icône de l'extension pour :
- Voir le statut de chaque token (✓ capturé / ✗ manquant)
- Forcer un **Sync** manuel si besoin
- Ouvrir directement Gandalf ou Panoramix

---

## Flow UX

```
Session active
  └─ Ouvre Dumbledore → connecté automatiquement ✓

Session Gandalf expirée (~2h)
  └─ Extension notifie → vas sur gandalf.epitech.eu → SSO Microsoft
  └─ Reviens sur Dumbledore → connecté automatiquement ✓

Première utilisation
  └─ Connecte-toi sur Gandalf + Panoramix
  └─ Tokens capturés → ouvre Dumbledore → connecté automatiquement ✓
```

---

## Utilisation en production (Vercel / domaine custom)

Si Dumbledore est déployé sur un domaine (ex: `dumbledore.mondomaine.com`) :

1. Dans `manifest.json`, ajoute le domaine dans `host_permissions` et `content_scripts` :

```json
"host_permissions": [
  "https://gandalf.epitech.eu/*",
  "https://panoramix.epitest.eu/*",
  "http://localhost/*",
  "https://dumbledore.mondomaine.com/*"
],
"content_scripts": [
  ...
  {
    "matches": ["http://localhost/*", "https://dumbledore.mondomaine.com/*"],
    "js": ["content/dumbledore.js"],
    "run_at": "document_idle"
  }
]
```

2. Recharge l'extension dans `chrome://extensions` (bouton ↺)

---

## Permissions requises

| Permission | Pourquoi |
|---|---|
| `cookies` | Lire `MoodleSession` et `refresh_token` (cookies HttpOnly) |
| `storage` | Stocker les tokens en local |
| `tabs` | Détecter les onglets ouverts |
| `scripting` | Injecter les tokens dans Dumbledore |
| `notifications` | Notifier quand un token est mis à jour |

Les tokens ne quittent jamais ton navigateur.
