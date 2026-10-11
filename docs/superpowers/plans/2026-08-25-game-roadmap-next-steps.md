# Zoo Empire — Nächste Schritte: Neulinge & Retention

**Datum:** 2026-08-25  
**Fokus:** Balance zwischen Neulinge-Erlebnis und Langzeit-Engagement

---

## Problem-Statement

Zoo Empire hat eine solide Basis mit 7 Minispielen, Multiplayer-Welt und Wirtschaftssystem. Aber:
- **Neulinge:** Zu viele Features auf einmal (12+ Quick-Actions). Onboarding unklar.
- **Besteende Spieler:** Progression plateau nach 2–3 Wochen (Coins/Tickets easy verdient, keine Langzeitziele).

---

## Phase 1: Neulinge (Woche 1–2 des Spiels)

### 1.1 Guided Onboarding Path
**Feature:** Schrittweise Tutorial-Gates statt Tutorial-Bubbles  
**Scope:**
- Zeige nur Tap → Inventory → Shop → erstes Minigame  
- „Achievement Unlock"-System: Neue Kategorie freischalten nach Meilenstein
  - ✅ Tap 50× → Minigames freischalten
  - ✅ Shop-Tier kaufen → Multiplayer-Features (Freunde, World)
  - ✅ 1h gespielt → Advanced (Trading, Leaderboards)

**Ticket:** `feat(onboarding): Progressive Feature-Freischaltung mit Milestone-Gates`

---

### 1.2 Lightweight First Run
**Feature:** Starte mit nur 3 Tieren + 1 Minigame  
**Scope:**
- Test-Account mit Auto-Unlock nach 30 Taps
- Oder: Split-Screen „Starter vs. Veteran" Mode

**Ticket:** `feat(game): Progression-Levels für Neuling-Erlebnis`

---

## Phase 2: Retention (Woche 3+ & Daily Active Users)

### 2.1 Season/Battle-Pass System
**Feature:** 30-Tage-Saisons mit Progression-Track  
**Scope:**
- Free-Track (für alle) + Premium-Pass (Coins-Konvertible)
- Wochenquests: Drift 3×, Wordle lösen, 100k Coins verdienen
- Rewards: Seltene Tiere, Kosmetik (Emotes, Tier-Skins)

**Ticket:** `feat(game): Saisons-System mit Wochenquests und Cosmetics`

---

### 2.2 Guild/Clan-System
**Feature:** 5–10 Spieler bilden einen Zoo-Verband  
**Scope:**
- Shared Weekly Boss-Fight (jeder bringt seine besten Tiere)
- Guild-Level: 1–30 (mit Guild-Shop: rare Tiere, Tier-Upgrades)
- Leaderboard: Top Guilds by Boss-Damage + Mitglieder-Coins/Woche

**Ticket:** `feat(game): Guild-System mit gemeinsamen Boss-Kämpfen`

---

### 2.3 Endgame: Tiered Prestige
**Feature:** Neue Economy für Post-Max-Spieler  
**Scope:**
- Level 100+ Tiere → „Ascend" Knopf (Level zurücksetzen → +1 Star)
- ⭐ Tiere: 2–5× schnellere Income, exklusive Minigame-Boosts
- Prestige-Leaderboard: Top nach Gesamt-Stars

**Ticket:** `feat(game): Prestige-System für Langzeit-Progression`

---

## Phase 3: World Expansion (August–September)

### 3.1 World Minigames
**Feature:** In der 3D-Welt spielbar (nicht nur Hub)  
**Scope:**
- Drift-Arena in World (visuelle Spuren bleiben Sekunden)
- Parkour-Zone mit leaderboard Platzierungen
- Memory-Tiles direkt im World-Zelt

**Ticket:** `feat(world): Minigame-Zonen in der 3D-Lobby integrieren`

---

### 3.2 Dynamic World Events
**Feature:** Zufällige Events in der World (2–3h Dauer)  
**Scope:**
- „Visitor Day": Zufällige besondere Besucher erscheinen (NPC-Tiere)
- „Weather Event": Bonuscoins für beste Tiere (z.B. Regen = Amphibien +20%)
- „Fountain Drought": Nur 2h pro Tag verfügbar (Urgency)

**Ticket:** `feat(world): Zeit-Events für dynamisches Lobby-Erlebnis`

---

## Phase 4: Social & Virality (September)

### 4.1 Referral Program
**Feature:** Teile Invite-Link → Beide bekommen Bonus  
**Scope:**
- Neue Spieler: +500 Startcoins
- Referrer: +1 exklusives Tier oder 10k Coins (pro 3 aktive Referrals)
- Leaderboard: Top Referrer (monatlich)

**Ticket:** `feat(game): Referral-System mit Invite-Links`

---

### 4.2 Replay-Share (Screenshots/Video-Clips)
**Feature:** Exportiere Best-Run als GIF/Video  
**Scope:**
- Parkour: 5-Sekunden-Highlight-Clip (Auto-Editor)
- Drift: Leaderboard-Position als Share-Card
- Share → Freund klickt → +5% Boost für beide (1h)

**Ticket:** `feat(game): Replay-Exporte und Social-Sharing`

---

## Priorität (MVP)

| Monat | Feature | Aufwand | Neulinge | Retention |
|-------|---------|--------|----------|-----------|
| 25.08 | Onboarding Gates | XS | ✅✅ | ✅ |
| 01.09 | Saisons + Quests | M | ✅ | ✅✅ |
| 08.09 | Guild-System | L | ✅ | ✅✅✅ |
| 15.09 | World Events | M | ✅ | ✅✅ |
| 22.09 | Referral | S | ✅ | ✅ |
| 29.09 | Prestige | M | - | ✅✅✅ |

---

## Technische Schulden

- **Tests:** SQL-Migrations für neue RPCs (Quests, Guilds, Prestige)
- **Schemas:** `seasons`, `guild_memberships`, `weekly_quests`, `prestige_stars`
- **RLSing:** Alle neuen Tabellen brauchen `security_invoker` + Policies

---

## Engagement-Metriken zum Tracking

1. **Retention:** DAU/MAU nach Onboarding
2. **Quests:** % Spieler, die ≥1 Wochenquest abschließen
3. **Guild:** % Spieler in ≥1 Guild
4. **Prestige:** % der Level-100-Spieler, die ≥1× Ascend triggern
5. **Referral:** Durchschn. neue Spieler pro aktiver Referral

---

## Nächster Commit

Diese Roadmap soll als **lebender Plan** behandelt werden:
- Specs (`.md`) vor Implementation  
- Pläne (`.md`) vor Tickets  
- Monatliche Sync: Metriken + Anpassung basierend auf Spieler-Feedback
