# Zoo Empire — Onboarding & Progression Guide

**Ziel:** Spieler schnell zum AHA-Moment bringen und langfristig engagieren — für Neulinge UND bestehende Spieler.

---

## 1. Neulinge: Erste 5 Minuten (Critical Path)

### 1.1 Login & Willkommensgeschenk
- **Was passiert:** Spieler landete auf IndexView, wird zu AuthView weitergeleitet
- **Ziel:** Authentifizierung + Basis-Emotion
- **Design-Punkt:** Willkommensbonus (z.B. 100 Start-Taps) ist bereits im GameView als `gift` modal
- **KPI:** 90%+ sollten bis zum ersten Tap gelangen

### 1.2 Erstes Tier kaufen (Shop → Erster Kauf)
**Ablauf in GameView:**
1. Spieler sieht eine leere Tierliste mit Hinweis: _"Kaufe dein erstes Tier im Shop, um es zu füttern und zu tippen"_ (i18n: `tap.buyFirst`)
2. Quick-Action-Button `.qa-btn` `Shop` ist prominent im Gold-Accent färbig
3. → Klick → ShopView öffnet sich
4. **Shop-Oberfläche:** Nur billiges Starter-Tier anzeigen (z.B. 🐘 Elefant 100 coins) — keine 1M-Tiere sichtbar machen
5. Kauf → Bestätigung → zurück zu GameView
6. **Aha-Moment:** "Ich habe ein Tier! Jetzt kann ich Coins sammeln!"

**Was nicht zeigen:**
- Tausende Tiere in Schachteln + Menü-Kakophonie
- Komplexe Upgrade-Mechaniken
- Minispiele als Hauptnavigation

### 1.3 Erstes Tippen (TAP Budgets)
- Favorite-Tier ist gesetzt → TAP-Button funktioniert
- Coins sammeln = unmittelbare Belohnung
- **Fortschritt-Bar:** Nächster Tier andeuten (z.B. "200🪙 für Zebra")

### 1.4 Erstes Upgrade (Tap-Multiplier)
- Nach 10–20 Coins: Hinweis auf Tap-Upgrades (`upgrades.title: "👆 Tap-Upgrades"`)
- Ein Upgrade für 50 Coins kaufen
- → Coins pro Tap steigen
- **Feedback:** Toast + visueller Anstieg bei nächstem Tap

**Checkpoint:** Nach ~5–10 Minuten sollte Spieler 3 Tiere, 2 Upgrades, und 1000+ Coins haben.

---

## 2. Neulinge: Erste Stunde (Feature Discovery)

### 2.1 Quick-Action Tiles (GameView unteres Menu)
Erst JETZT Features nacheinander aktivieren:

#### Phase A (erste 15 Min):
✅ **Shop** — bereits aktiv  
✅ **Inventory** — zeigt Tiere + Futter  
🎟️ **Tickets** — noch graubar oder mit Hinweis "_Verdiene Tickets in Minispielen_"

#### Phase B (Minuten 15–30):
🎮 **Memory** — einfaches Minispiel (3×3), 10–20 Tickets Belohnung
- **Warum?** Schnelle Erfolgserlebnisse, Intro zu Ticketsystem
- **Ziel:** "_Mit Tickets kommen neue Tiere!_"

#### Phase C (Minuten 30–50):
📝 **Wordle** — täglich 1×, 20–50 Coins  
🏎️ **Drift** — schnelle 1-Minute Challenges, Coins

#### Phase D (Stunde 1+):
👥 **Friends** — Social Proof, nicht essenziell  
🤝 **Trade** — Tiere austauschen (später, nach 10+ Tiere collected)  
🌍 **World** — Multiplayer Lobby mit Kosmetik (später)

### 2.2 Progression in i18n + UI
- **Neulinge sollen nicht überfordert werden** mit Menü-Überflutung
- Quick-Action-Buttons sollten **progressiv freigeschaltet** werden:
  - `qa-btn.unlock = false` versteckt Button
  - Nach erstem Kauf: `memory` + `wordle` sichtbar
  - Nach 5 Minuten AFK: `drift` sichtbar
  - Nach 1 Stunde: `friends`, `world`

### 2.3 In-Game Onboarding (Tutorial Bubbles)
- **TutorialBubble.vue** bereits im Projekt
- **Beispiele:**
  - "Deine Taps werden hier abgerechnet" → zeigt auf TAP-Button
  - "Sammle mehrere Tiere für höhere Einnahmen!" → zeigt auf Tier-Liste
  - "Minispiele geben Tickets für rare Tiere" → zeigt auf Minispiel-Icon

---

## 3. Bestehende Spieler: Retention & Growth

### 3.1 Tägliche Ziele (Dailies)
**Implementierung:**  
- Daily Reward Modal (bereits da: `DailyRewardModal.vue`)
- Täglich Login-Bonus: +1000 Coins, +3 Tickets, +1 daily streak
- **Streak-System:** 7 Tage = 2M Bonus

**Warum?** Gewöhnung, Routine etablieren.

### 3.2 Weekly Targets (für aktive Spieler)
- **Montag:** Boss-Fight Challenge (neues Ziel)
- **Mittwoch:** Parkour 3D (High-Skill, high-reward)
- **Freitag:** Leaderboard-Push (Wettbewerb)

**Umsetzung:** Notifications + Progress-Bar in GameView

### 3.3 Monetization Pfade (ohne Zwang)

#### Path A: Collector
- Ziel: Alle 200+ Tiere sammeln
- Incentive: **Collection-Boni** (z.B. bei 50 Tiere: +10% Coins für alle)
- Milestone-Rewards: 10, 25, 50, 100, 150, 200 Tiere

#### Path B: Minispiel-Master
- Ziel: Hohe Scores in allen Minispielen
- Leaderboards pro Minispiel (Weekly Top 10)
- Reward: Exclusive Tiere, Kosmetik

#### Path C: Social (Freunde/World)
- Freunde einladen → beide +Bonus
- World-Besuche → +1% temp. income Boost
- Emote-Collections für Interaktionen

#### Path D: Boss Progression
- **Boss Path:** 5 Tiers (Normal → Hard → Nightmare)
- Jeden Tier besiegen: +10% coin multiplier
- Endgame-Content für 50+ Stunden Player

### 3.4 Infinite Scaling (Long-term Engagement)
- **Coins:** Unbegrenzt skalierbar (1T, 1Quad, etc.)
- **Multipliers:** Keine Cap (10x → 100x → 1000x)
- **Tiere:** Neue Spezies monatlich hinzufügen
- **Minispiele:** Seasonal Themes (Sommer-Memory, Weihnachts-Parkour)

---

## 4. Feature-Entdeckungs-Karte

### Hierarchie der Features (nach Onboarding-Phase)

```
GAMEVIEW (Kern)
├─ TAP Mechanics (sofort)
├─ Tier-Sammlung (erste 5 Min)
├─ Tap-Upgrades (erste 15 Min)
│
├─ MINISPIELE (15–50 Min)
│  ├─ Memory (leicht, niedrig-reward)
│  ├─ Wordle (täglich, mid-reward)
│  └─ Drift (schwer, hoch-reward)
│
├─ SHOP (sobald Geld da)
│  ├─ Tiere kaufen (Priorität)
│  ├─ Futter kaufen (später)
│  └─ Kosmetik (Endgame)
│
├─ ERWEITERTE FEATURES (30 Min+)
│  ├─ Inventory (Tier-Management)
│  ├─ Tickets (Währung verstehen)
│  ├─ Parkour (3D-Abenteuer, cool!)
│  ├─ Freunde (Social Proof)
│  ├─ World (Multiplayer Lobby)
│  └─ Boss-Fight (Endgame)
│
└─ META (später)
   ├─ Leaderboards (Ranglisten)
   ├─ Profil (Share deinen Progress)
   ├─ Support (Hilfe)
   └─ Settings (Sprache, Logout)
```

---

## 5. UI/UX Verbesserungen für Onboarding

### 5.1 Quick-Action Button Freischaltung
**Status quo:** Alle Buttons sind sichtbar (Überladung!)  
**Neu:**

```javascript
// src/composables/useFeatureUnlock.js
export function useFeatureUnlock() {
  const game = useGameStore();
  
  const isUnlocked = (feature) => {
    const now = Date.now() + game.serverOffset;
    const timePlayed = now - game.createdAt;
    
    switch (feature) {
      case 'memory': return timePlayed > 900_000; // 15 Min
      case 'wordle': return timePlayed > 900_000; // 15 Min
      case 'drift': return timePlayed > 1_800_000; // 30 Min
      case 'parkour': return game.coins > 10_000;
      case 'friends': return timePlayed > 3_600_000; // 1 Std
      case 'world': return game.tickets > 0; // Nach erstem Minispiel
      default: return true;
    }
  }
  
  return { isUnlocked }
}
```

### 5.2 Tutorial Bubbles für kritische Punkte
- **Erstes Tier kaufen:** "Tiere geben dir Coins pro Tap"
- **Erstes Upgrade:** "Upgrades erhöhen deine Einkommen"
- **Erstes Minispiel:** "Minispiele geben dir neue Tiere!"
- **Freunde hinzufügen:** "Freunde = gemeinsame Erfolge"

### 5.3 Progress Indicators
- **Level-System** (optional): Level 1–100, Visual Progress
- **Achievements:** "10 Tiere gesammelt 🏆", "1M Coins verdient 💰"
- **Completion %:** Menü zeigt "Sammlung: 25% (53 von 212)"

---

## 6. Bestehende Spieler: Retention-Mechanics

### 6.1 Comeback-Rewards
**Szenario:** Spieler kehrt nach 3 Tagen zurück.

```javascript
// src/composables/useReturnRefresh.js (bereits im Projekt)
// → kann erweitert werden um:
const comebackBonus = (daysSinceVisit) => {
  if (daysSinceVisit === 1) return { coins: 10_000, tickets: 1 };
  if (daysSinceVisit === 3) return { coins: 100_000, tickets: 5 };
  if (daysSinceVisit >= 7) return { coins: 1_000_000, tickets: 20 };
  return null;
}
```

### 6.2 Streak-System
- **Täglicher Login:** +1 Streak
- **7er Streak:** +50% Coins-Bonus nächste 24h
- **30er Streak:** Exclusive Tier freischalten

### 6.3 Seasonal Events
- **Monatliche Herausforderungen:** "Gewinne 10M Coins diesen Monat"
- **Leaderboard Seasons:** Top 100 bekommen Exclusive Kosmetik
- **Limited-Time Tiere:** Nur diese Woche kaufbar (Urgency)

---

## 7. Erste Woche (Day 7 Retention Focus)

| Zeit | Event | Ziel |
|------|-------|------|
| Tag 1, 0 Min | Willkommensgift | +100 Taps |
| Tag 1, 5 Min | Erstes Tier | Verstehen: Tiere = Einkommen |
| Tag 1, 30 Min | Memory-Minispiel | Verstehen: Tickets erlauben neue Tiere |
| Tag 2 | Daily Login | Routine bilden |
| Tag 2 + 3 | Boss-Fight Level 1 | Neues Feature ausprobieren |
| Tag 4 | Leaderboard-Position | Wettbewerb-Gefühl |
| Tag 5 | Freunde hinzufügen | Social Engagement |
| Tag 7 | Streak-Bonus | Langzeit-Belohnung zeigen |

---

## 8. Neue Spieler vs. Bestehende: Unterschiedliche Pfade

### Neue Spieler (Tag 1–7)
✅ Fokus: **Fun First** — schnelle Erfolge  
✅ Features: Nur essenzielle Buttons zeigen  
✅ Rewards: Häufiger & sichtbar  
✅ Herausforderung: Moderat (Memory 3×3, nicht 5×5)

### Etablierte Spieler (Woche 2+)
✅ Fokus: **Progression & Mastery**  
✅ Features: Alle Buttons, keine Wahlfreiheit  
✅ Rewards: Langfristig geplant (Milestones)  
✅ Herausforderung: Hoch (Boss Nightmare, Parkour Hard)

### Hardcore Player (Monat 1+)
✅ Fokus: **Optimization & Community**  
✅ Features: Admin-Tools, Leaderboards, Events  
✅ Rewards: Cosmetics, exclusive animals  
✅ Herausforderung: Meta-Game (beste Builds, Speedruns)

---

## 9. Implementierungs-Checkliste für nächste Steps

### Sofort (Woche 1)
- [ ] **Feature-Unlock-Composable** erstellen (`useFeatureUnlock.js`)
- [ ] **Tutorial Bubbles** für erste 3 Features
- [ ] **Shop-Filter** für "Neue Spieler" (nur billige Tiere)
- [ ] **Comeback Bonus** bei Rückkehr implementieren

### Kurz (Woche 2–3)
- [ ] **Streak-System** (Daily Logins)
- [ ] **Achievements** (10, 50, 100 Tiere, 1M Coins, etc.)
- [ ] **Seasonal Events** (Monthly Challenges)
- [ ] **UI Labels** für Features ergänzen ("Was ist das?")

### Mittel (Woche 4–6)
- [ ] **Leaderboard-Seasons** (Weekly Top 10)
- [ ] **Level-System** (optional, visuell)
- [ ] **Comeback-Rewards** integrieren
- [ ] **New Player Tutorial Video** (optional)

### Lang (Monat 2+)
- [ ] **Community Features** (Guilds, Clans)
- [ ] **Seasonal Tiere** (Weihnachts-Rentier, Oster-Hase)
- [ ] **Patch Notes in-game** zeigen
- [ ] **Player Analytics** (Retention Curve analysieren)

---

## 10. KPIs zum Messen (Wenn Analytics-Backend vorhanden)

| Metrik | Target | Reason |
|--------|--------|--------|
| **Day 1 Retention** | 50%+ | Neue Spieler kommen zurück |
| **Day 7 Retention** | 30%+ | Erste Woche ist kritisch |
| **Avg. Session Time** | 15+ Min | Lange Sessions = Engagement |
| **Daily Active Users** | +20% MoM | Spielerbasis wächst |
| **Feature Discovery** | 80% spielen 3+ Minispiele | Content wird konsumiert |
| **Tier 4 (Diamond) Adoption** | 60%+ | Progression funktioniert |

---

## 11. A/B Testing Ideen

### Variant A: "Progressive Unlock" (Empfohlen)
- Features schrittweise freischalten
- Tutorial Bubbles aktiv
- Einfacherer Start

### Variant B: "All Features" (Baseline)
- Alle Buttons sofort sichtbar
- Minimal Tutorials
- Selbst erkunden

**Hypothese:** Variant A führt zu höherem Day 7 Retention (wegen niedrigerem Overwhelm).

---

## 12. Fehler, die vermieden werden sollten

❌ **Zu viele Buttons auf einmal** — Neue Spieler sind überfordert  
❌ **Keine klare "Nächster Schritt"** — Sie wissen nicht, was zu tun ist  
❌ **Belohnungen zu langsam** — Kein Aha-Moment in ersten 5 Min  
❌ **Zu hohe Schwierigkeit** — Memory 5×5 auf Tag 1 = Frustration  
❌ **Keine Offline-Rewards** — AFK-Spieler brauchen Anreiz zurückzukommen  

---

## Fazit

**Zoo Empire wird cool für ALLE, wenn:**

1. **Neulinge** schnell ihr erstes Tier haben + erste Coins verdienen (Aha-Moment in < 5 Min)
2. **Progress sichtbar** ist (Level, Sammlung %, Streaks, Achievements)
3. **Features schrittweise** entdeckt werden (nicht alle auf einmal)
4. **Tägliche Anreize** existieren (Logins, Streaks, Challenges)
5. **Bestehende Spieler** End-Game-Content haben (Boss Tiers, Leaderboards, Events)

**Nächster PR:** Feature-Unlock-System + First Bubble implementieren.
