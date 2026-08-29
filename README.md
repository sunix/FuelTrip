# FuelTrip — Fuel Stop Optimizer (PWA)

FuelTrip est une PWA frontend-only (Vite + TypeScript) pour recommander les meilleures stations-service pendant un trajet en tenant compte **du prix ET du détour**.

## Stack

- TypeScript
- Vite
- PWA (`vite-plugin-pwa`)
- Vitest
- ESLint
- Prettier

## Démarrage

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Variables d'environnement

Copier `.env.example` vers `.env` :

- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_MAX_DISTANCE_FROM_ROUTE_METERS`
- `VITE_FUEL_API_BASE_URL` (optionnel)

⚠️ La clé Google Maps est utilisée côté navigateur. Elle doit être restreinte par **HTTP referrer** (domaine GitHub Pages / domaine de prod), avec uniquement les APIs nécessaires.

Le fichier `.env` ne doit jamais être commité.

## Architecture

```text
src/
  api/
    google-routes.ts
    fuel-prices.ts
  config/
    env.ts
  domain/
    fuel.ts
    route.ts
    station.ts
    geometry.ts
    optimizer.ts
  services/
    route-service.ts
    station-service.ts
  ui/
```

Le domaine (`domain/optimizer.ts`) ne dépend pas des APIs externes.

## MVP actuel

- UI mobile-first simple
- stratégies:
  - Meilleur compromis
  - Moins cher
  - Moins de détour
- recommandations avec:
  - nom station
  - prix / litre
  - type carburant
  - distance au trajet
  - détour estimé
  - temps supplémentaire estimé
- bouton “Naviguer vers cette station” (ouverture Google Maps)
- gestion des états: chargement, erreur API, aucune station trouvée, prix indisponible, géolocalisation refusée

Le flux UI principal appelle l'itinéraire Google Routes puis l'open data carburants en direct (voir `.env.example` pour la configuration requise).

## Tests

```bash
npm run test
```

Couvre:

- Haversine
- distance point/polyline
- filtrage des stations autour de l'itinéraire
- scoring et classement
- prix manquants
- égalités
- différents types de carburants

## APIs externes

- Adaptateur Google Routes: `src/api/google-routes.ts`
- Adaptateur Open Data carburants: `src/api/fuel-prices.ts`

L'adaptateur carburants est volontairement tolérant au schéma (plusieurs noms de champs testés) afin d'éviter un couplage fort à une seule version de payload.
