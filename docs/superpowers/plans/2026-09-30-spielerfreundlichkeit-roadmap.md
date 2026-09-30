# Zoo Empire — Spielerfreundlichkeits-Roadmap 2026

**Ziel:** Zoo Empire zu einem einladenden, engagierenden Spiel für Neulinge und bestehende Spieler machen.

---

## 1. Neulinge: Das erste Abenteuer

### 1.1 Interaktives Onboarding (Priority: 🔴 Kritisch)

**Problem:** Neulinge verstehen die Wirtschaft nicht sofort (Coins vs. Tickets, RPCs vs. lokale Käufe, Farm-Bauplätze).

**Lösung:**
- **Interaktive Tutorial-Sequenz** im Spiel (nicht nur ein Dialog):
  1. Erstes Tier sammeln (Story: "Dein Zoo-Partner!")
  2. Erstes Minispiel spielen → Coins verdienen
  3. Tier ausrüsten mit Items
  4. Zoo-Welt betreten (3D-Erlebnis)
  5. Erstes Ticket verdienen (Parkour/Memory/Wordle)
  
- **Guided-Mode Indicator:**
  - Glow-Effekt auf nächstem Ziel (`.guided-glow`)
  - Toast-Hinweise: "💡 Tipp: Parkour spielt 2 Coins ein!"
  - Skip-Button für erfahrene Spieler

- **Glossar-Modal** (`?` in der Header):
  - Begriffe: Coins, Tickets, RPCs, Tier-Seltenheit, Bauplatz-Bindung
  - Mit Symbolen und Beispiel-Belohnungen
  - Mehrsprachig: DE/EN/RU

**Umsetzung:**
- Neue Tabelle `tutorial_state` (user_id, step, completed_at, skipped)
- RPC `tutorial_step_complete(p_step)` mit Belohnung (100 Coins für ersten Parkour)
- View `TutorialOverlay.vue` mit Pointer & Dimming
- `src/tutorial.js`: Logik für Schritte & Progression

---

### 1.2 Progressive Komplexität (Priority: 🟡 Hoch)

**Problem:** Alles auf einmal überfordert (Zoo, Börse, Events, Breeding, Crafting).

**Lösung:**

| Phase | Verfügbar | Sperren bis Level |
|-------|-----------|------------------|
| **Woche 1** | Sammeln, Parkour, Memory | - |
| **Woche 2** | Zoo-Welt, Wordle, erste Items | Level 5 Tiere |
| **Woche 3** | Tier-Börse (nur Ansicht) | 3 Tiere gesammelt |
| **Woche 4+** | Breeding, Crafting, Events | Level 10 Tiere |

- **Feature-Unlock-Dialog:** "🎉 Neue Funktion!" mit kurzer Erklärung
- `user_meta.level_unlocks` speichert Freischaltzeitpunkte
- RPC `check_unlocks()` in `useReturnRefresh`

---

### 1.3 Starter-Pack (Priority: 🟡 Hoch)

Kostenlos in den ersten 24h:
- **1 garantiertes Tier** (Gepard, als Beispiel)
- **500 Coins** (für erste Items)
- **3 Tier-Slots** (zum Sammeln)
- **"Zoo-Gründer"-Badge** (Kosmetik)

RPC `claim_starter_bonus()` — einmalig pro Account.

---

## 2. Bestehende Spieler: Engagement & Langzeitbindung

### 2.1 Events & Seasonal Content (Priority: 🔴 Kritisch)

**Problem:** Idle-Games werden langweilig ohne neue Ziele.

**Lösung:**

#### Wöchentliche Events
- **Time-Limited Challenges:** z. B. "Sammle 5 rote Tiere diese Woche"
- **Reward Tiers:** Bronze (100 Coins) → Silber (Ei) → Gold (Seltenes Tier)
- `events` Tabelle mit `start_date`, `end_date`, `event_type`, `reward_tier`
- RPC `claim_event_reward(p_tier)` prüft Progress

#### Seasonal (Saisons = 8 Wochen)
- **Spring (März–April):** Frühjahrs-Tiere (Schmetterling, Frosch)
- **Summer (Mai–Juni):** Wassertiere, Parkour-Twist
- **Fall/Winter:** Winterfest mit exklusiven Items

#### Daily-Quest-System
- 3 tägliche Quests: z. B. "1 Minispiel spielen", "Zoo-Freunde sehen", "Tier füttern"
- Abschlussboni: +50 Coins, +1 Glücksticket
- `daily_quests` mit User-Fortschritt pro UTC-Tag

---

### 2.2 Soziale Features & Multiplayer (Priority: 🟡 Hoch)

Bereits vorhanden: Zoo-Welt (Presence), Freundschaftsanfragen, Börse (P2P).

**Neue Ideen:**
- **Zoo-Visits:** andere Zoos besuchen (Read-only 3D-Tour)
  - RPC `visit_friend_zoo(p_friend_id)` → Position, ausgerüstete Tiere, Dekorationen
  - "👍 Magst du Daniels Zoo?" → Gefällt-mir-System
  
- **Breeding-Kooperation:** mit Freunden Tiere züchten (für seltene Gene)
  - `breeding_requests` Tabelle
  - Beide verdienen XP für das Ei
  
- **Leaderboards** (schon spec'd, aber nicht visible):
  - Coins-Overall, Zoo-Level, Minispiel-Bestzeiten
  - Weekly reset für frische Chancen
  - `rankings` View (`user_id, rank, score, week`)

---

### 2.3 Progression-Transparenz (Priority: 🟡 Hoch)

**Problem:** Spieler wissen nicht, warum Progression langsamer wird.

**Lösung:**

- **Stat-Dashboard** in Settings:
  - Spielzeit: `X Tage, Y Stunden`
  - Tiere: `42/200` (Sammler-Ziel)
  - Level-Progress: `Level 15 → 42% zu Level 16`
  - Nächster Unlock: "Breeding (freigeschalten bei 10 Tieren)"
  
- **Zarathustering-Kurve erklären** (Why progression slows):
  - `src/docs/progression.md` im Game verlinken
  - "Dein Zoo ist gewachsen! Höhere Tiere brauchen länger zum Trainieren — das ist normal. 📈"

- **Ziel-Modul:**
  - "Große Ziele": 50 Tiere sammeln, Level 20 erreichen
  - "Diesen Monat" Tracker: besondere Herausforderungen
  - `user_meta.goals` speichert Zwischenstände

---

### 2.4 Breeding & Crafting-Balance (Priority: 🟢 Mittel)

**Ist-Stand:** Spec ist vorhanden, Umsetzung prüfen.

**Sicherstellen:**
- Züchtung belohnt **Geduld** (z. B. 12h Ei-Inkubation), nicht Pay-to-Win
- Rarity-Gene sind nicht erzwingbar, aber sichtbar
- Craft-Rezepte sind **erreichbar**, nicht grindig
  - z. B. "3 Gemeinde + 1 Selten → 1 Sehr Selten" (eine Stunde Farming)

- **Seed & RNG transparent:** Spieler sehen **warum** ihr Tier +/-1 Stufe ist
  - Modal: "Genetic Lottery: Mama Gepard (Kraft +2) + Papa Krokodil (Ausdauer +1) = 65% Kraft, 35% Ausdauer"

---

## 3. Qualität & Zugänglichkeit

### 3.1 Performance (Priority: 🔴 Kritisch)

- **3D-Features (Parkour, Zoo-Welt):**
  - WebGL-Speicherleck vermeiden (Dispose-Pattern)
  - Mobile: Pixel-Ratio ≤ 1.5, Poly-Budget ≤ 50k
  - Target: 60 FPS auf Mid-Range Android (z. B. Poco X3)
  
- **Minispiele-Ladezeit:**
  - Code-Split nach Route
  - Preload `<link rel="modulepreload">` für häufige Features
  - Target: <2s auf 4G

- **Börsen-Performance:**
  - Lazy-Load Listings (10 pro Seite)
  - `market_snapshots` cachen, nicht jedes Mal berechnen
  - Search-Index auf `species_id + tier`

### 3.2 Zugänglichkeit (Priority: 🟡 Hoch)

- **Bildschirmleser (a11y):**
  - Semantisches HTML (keine reinen `<div>` für Buttons)
  - `aria-label` für Icons
  - Farbblind-sicheres Tier-Ranking (nicht nur Farbe, auch Symbol)
  
- **Localization:** de/en/ru vollständig
  - DE: echte Umlaute (ä ö ü ß), keine ae/oe/ue
  - RU: kyrillisch, nicht transliteriert
  - RTL-ready (Vorbereitung für Arabisch)

- **Dark Mode default für 21:00–06:00** (Augen schonen)
  - In `useTheme.js` prüfen: `hour >= 21 || hour < 6`

### 3.3 Fehlerbehandlung & Resilienz (Priority: 🟡 Hoch)

- **Netzwerkfehler:** User gets toast "Offline — deine Aktion wird gespeichert 📱"
  - RPC-Queue lokal, Sync sobald online
  - `useOfflineQueue()` Composable

- **RPC-Fehler:** Server-Logs wenn Invarianten brechen
  - z. B. "user.coins < 0" → Log to Sentry
  - Spieler bekommt "Etwas ist schiefgelaufen — unser Team wurde informiert!"
  - Rollback Client-State

- **Stale Server:** `server_now` Offset tracken, Max 1 Minute
  - Wenn Offset zu groß: "Bitte aktualisiere die App" → Hard reload

---

## 4. Monitoring & Feedback

### 4.1 Telemetrie (Priority: 🟡 Hoch)

Neue Events in Analytics:

| Event | Ziel |
|-------|------|
| `tutorial_step_complete` | Dropoff tracken |
| `first_minigame_play` | Engagement im ersten Tag |
| `first_zoo_visit` | 3D-Akzeptanz |
| `first_breeding_start` | Meta-Game Engagement |
| `event_participation` | Event-Durchsatz |
| `churn_indicator` | 3+ Tage inaktiv → Gewinn-Kampagne |

- Vercel Analytics auslesen (Goals/Conversions)
- Sentry für Fehler (performance, crashes)

### 4.2 In-Game Feedback (Priority: 🟢 Mittel)

- **Roadmap-Voting:** bereits live (`/support?tab=roadmap`)
  - Top-3 Features monatlich vorstellen → "Das baut ihr nächste Woche!"

- **Spieler-Umfrage (Modal):**
  - Nach 7 Tagen: "Wie gefällt dir Zoo Empire? 1⭐ – 5⭐"
  - 1–2 Sterne: "Was können wir besser machen?" → Support-Ticket
  - 5 Sterne: "Teile dein Feedback auf Roadmap!"

---

## 5. Launch-Plan (Phasen)

### Phase 1: Fundamentals (Woche 1–2)
- [ ] Tutorial-System (Schritte 1–3: Sammeln, erstes Minispiel, ausrüsten)
- [ ] Starter-Pack RPC
- [ ] Glossar-Modal
- [ ] Build-Test auf Ladezeit

### Phase 2: Engagement (Woche 3–4)
- [ ] Event-System & erste wöchentliche Challenge
- [ ] Daily Quests
- [ ] Stat-Dashboard
- [ ] Zoo-Visits (Read-only)

### Phase 3: Community (Woche 5–6)
- [ ] Leaderboards UI
- [ ] Breeding-Requests
- [ ] Roadmap-Voting UI-Refresh
- [ ] Spieler-Umfrage

### Phase 4: Polish (Woche 7+)
- [ ] Offizielle Docs (`/help`, FAQ)
- [ ] Performance-Optimierung
- [ ] Fehlerbehandlung erweitern
- [ ] Launch-Marketing-Assets

---

## 6. Erfolgs-Metriken

- **Retention:** > 40% 7-Tage-Retention (aktuell: TBD)
- **Tutorial-Completion:** > 70% schließen Tutorial ab
- **DAU:** 2× Wachstum im ersten Monat
- **Time-to-first-Breeding:** < 5 Tage (langfristiges Engagement Signal)
- **NPS:** > 40 (via Umfrage)

---

## 7. Tech Stack (Existing + New)

| Feature | Stack | Status |
|---------|-------|--------|
| Tutorial | Vue 3, Pinia, RPC | 🔄 Zu bauen |
| Events | Postgres, RPC | 🔄 Zu bauen |
| Daily Quests | Postgres, RPC | 🔄 Zu bauen |
| Analytics | Vercel Analytics, Sentry | ✅ Vorhanden |
| i18n | `src/i18n.js`, Tokens | ✅ Vorhanden |
| Dark Mode | CSS Tokens, theme.js | ✅ Vorhanden |
| 3D | Three.js, WebGL | ✅ Vorhanden |

---

## Anhang: Beispiel-Benutzerfluss (Tag 1 Neulinge)

```
1. Login
   ↓
2. Starter-Pack Modal: "Willkommen in Zoo Empire! 🦁"
   - Gepard erhalten
   - 500 Coins erhalten
   - "Lass uns beginnen!"
   ↓
3. Tutorial Step 1: Tier sammeln
   - Canvas fokusiert auf Tier-Card
   - Toast: "Dein erster Zoo-Partner!"
   - "Weiter →"
   ↓
4. Tutorial Step 2: Erstes Minispiel
   - Focus auf Parkour-Quickaction
   - Toast: "Parkour spielen für Coins!"
   - Nach erstem Spiel: +100 Coins Bonus
   ↓
5. Tutorial Step 3: Ausrüsten
   - Shop gezeigt (gefiltert auf Anfänger-Items)
   - "Kauf ein Item für deinen Gepard"
   - Nach Kauf: Level ↑
   ↓
6. Tutorial Step 4: Zoo-Welt
   - "Besuche deine Zoo-Welt!"
   - 3D-Environment lädt
   - First time magic ✨
   ↓
7. Onboarding complete
   - "Glückwunsch! Jetzt erkunde die Welt 🗺️"
   - Alle Features verfügbar (mit Unlock-Ankündigungen)
```

---

## Autoren & Versioning

- **Erstellt:** 2026-09-30
- **Autor:** Claude Code (Haiku 4.5)
- **Status:** Roadmap (Brainstorm → Implementierung)
- **Letzte Änderung:** 2026-09-30

**Nächste Schritte:** Voting im Roadmap-System, dann Sprint-Planung für Phase 1.
