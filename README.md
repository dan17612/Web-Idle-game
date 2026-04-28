# 🐾 Zoo Empire — Web Idle Game

Ein mobile-first Idle-Game rund um Tiere. Spieler kaufen Tiere, verdienen passiv Münzen (auch offline), senden sich gegenseitig Coins und handeln Tiere auf dem Marktplatz.

- **Frontend:** Vue 3 + Vite + Pinia + Vue Router
- **Backend:** [Supabase](https://supabase.com) (Auth + Postgres + Row Level Security + RPCs)
- **Deployment:** Statisch hostbar (Vercel / Netlify / Cloudflare Pages) — Supabase als BaaS

## Features

- 📱 Mobile-first UI mit Bottom-Navigation, große Tap-Flächen, Safe-Area-Support.
- 🐣 10 Tier-Typen vom Küken bis zum Drachen mit passivem Einkommen.
- 💤 Offline-Earnings (bis zu 8 h) — Fortschritt wird serverseitig gespeichert.
- 🪙 Coins an andere Spieler senden (via Username).
- 🔄 Marktplatz: Tiere öffentlich oder gezielt an einen Spieler anbieten und kaufen.
- 🏆 Bestenliste mit Top 50 Spielern.
- 🔒 Sicherheit: Alle kritischen Aktionen (Kauf, Senden, Trade) laufen über `SECURITY DEFINER` RPCs auf Supabase — keine Client-Manipulation möglich.

## Setup

### 1. Supabase-Projekt erstellen
1. Auf [supabase.com](https://supabase.com) ein neues Projekt anlegen.
2. Im **SQL Editor** den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen. Das erstellt:
   - Tabellen: `profiles`, `animals`, `transactions`, `trade_offers`
   - Trigger: automatisches Profil-Anlegen bei Signup (mit `username` aus den Meta-Daten)
   - RPCs: `buy_animal`, `send_coins`, `create_trade_offer`, `accept_trade_offer`, `cancel_trade_offer`
   - RLS-Policies für sicheren Zugriff.
3. Unter **Authentication → Providers** den Email-Provider aktivieren. Für Dev „Confirm email" deaktivieren.

### 2. Lokale Entwicklung
```bash
cp .env.example .env
# Trage VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY aus dem Supabase Dashboard ein.

npm install
npm run dev
```

Die App läuft unter `http://localhost:5173` — öffne sie im Handy-Browser (gleiches WLAN) oder im Mobile-Modus der Chrome DevTools.

### 3. Production Build
```bash
npm run build
npm run preview
```
Der `dist/`-Ordner kann statisch deployt werden (Vercel, Netlify, Cloudflare Pages, etc.).

## Projekt-Struktur

```
src/
  animals.js          # Tier-Katalog (Preise, Einkommen, Emojis) + formatCoins()
  supabase.js         # Supabase-Client
  router.js           # Routen + Auth-Guard
  main.js, App.vue    # Entrypoint + Shell mit Top-Bar und Bottom-Nav
  styles.css          # Mobile-first Design-Tokens & Komponenten
  stores/
    auth.js           # Session + Profil
    game.js           # Coins-Tick, Offline-Earnings, Aktionen
  views/
    AuthView.vue      # Login / Registrieren
    GameView.vue      # Farm mit Tap-Bonus und Tier-Übersicht
    ShopView.vue      # Tiere kaufen
    SendView.vue      # Münzen an Username senden + Historie
    TradeView.vue     # Marktplatz: anbieten, kaufen, eigene Offers
    LeaderboardView.vue
supabase/
  schema.sql          # SQL für Tabellen, Trigger, RPCs, RLS
```

## Balancing

Alle Werte in `src/animals.js` — beliebig anpassbar:

| Tier     | Preis 🪙       | Einkommen / Sek |
|----------|---------------:|----------------:|
| Küken    | 50             | 0.5             |
| Huhn     | 250            | 2               |
| Hase     | 1 200          | 8               |
| Schwein  | 6 000          | 35              |
| Schaf    | 30 000         | 160             |
| Kuh      | 150 000        | 800             |
| Pferd    | 750 000        | 3 800           |
| Panda    | 4 000 000      | 18 000          |
| Tiger    | 20 000 000     | 85 000          |
| Drache   | 100 000 000    | 420 000         |

## Sicherheitshinweise

- Der Client sendet nur Absichten (z. B. „kaufe Spezies X"). Alle Coin- und Besitz-Mutationen passieren serverseitig in Postgres-Funktionen mit Checks (`coins >= cost`, Besitzverhältnisse, Atomik).
- Der anon-Key ist öffentlich — daher ist RLS aktiviert. Schreibzugriff auf `profiles`, `animals`, `transactions`, `trade_offers` läuft ausschließlich über die RPCs.
- Offline-Earnings sind auf 8 h gedeckelt, damit Missbrauch begrenzt ist.

## Plattform-Builds

Electron baut Desktop-Apps für Windows, macOS und Linux. Android und iOS laufen in diesem Projekt über Capacitor, weil Electron diese mobilen Plattformen nicht als Zielplattformen unterstützt.

### Windows mit Electron

```bash
npm run electron:dev
npm run electron:start
npm run dist:windows
```

- `electron:dev` startet Vite und öffnet die App im Electron-Fenster.
- `electron:start` baut `dist/` und startet die gebaute App lokal.
- `dist:windows` erzeugt Windows-Artefakte im Ordner `release/`.

### Android und iOS mit Capacitor

```bash
npm run cap:sync
npm run cap:android
npm run cap:ios
```

- Android benötigt Android Studio mit installiertem SDK.
- iOS benötigt macOS mit Xcode; der iOS-Projektordner kann hier versioniert werden, gebaut wird er aber auf einem Mac.
- Für Magic-Link- und OAuth-Redirects kann `VITE_AUTH_REDIRECT_URL` gesetzt werden. Die URL muss zusätzlich in Supabase als erlaubte Redirect-URL eingetragen sein.

## Lizenz
MIT — siehe `LICENSE`.
