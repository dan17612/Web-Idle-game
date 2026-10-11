# Feature Integration Guide — Zoo Empire

**Datum:** 2026-09-16  
**Zweck:** Übersicht aller Features und wie sie sich für Neulinge und bestehende Spieler zu einem Ganzen zusammenfügen.

---

## 🗺️ Feature-Landkarte

```
┌─────────────────────────────────────────────────────────────┐
│                   ZOO EMPIRE — FEATURE STACK                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  CORE LOOPS:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ FARM (GameView)                                      │   │
│  │ • Coins verdienen durch Tappen oder passiv         │   │
│  │ • Tiere sammeln (10 Stufen: Küken → Drache)        │   │
│  │ • Offline-Earnings (bis 8h)                         │   │
│  │ • Safari-Eggs (seltene Varianten)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────┬──────────────────┬──────────────────┐ │
│  │  MINIGAMES       │  ECONOMY          │  SOCIAL          │ │
│  ├──────────────────┼──────────────────┼──────────────────┤ │
│  │                  │                   │                  │ │
│  │ • Wordle         │ • Shop            │ • Leaderboard    │ │
│  │   (Casual, 2min) │   (Tier kaufen)   │   (Top 50)       │ │
│  │                  │                   │                  │ │
│  │ • Memory         │ • Tickets         │ • Friends        │ │
│  │   (Social, 3min) │   (Quest-System)  │   (Inv. share)   │ │
│  │                  │                   │                  │ │
│  │ • Memory Online  │ • Trade           │ • World          │ │
│  │   (Co-op, 5min)  │   (P2P-Markt)     │   (Multiplayer)  │ │
│  │                  │                   │                  │ │
│  │ • Parkour 3D     │                   │ • Send Coins     │ │
│  │   (Skill, 5min)  │                   │   (Gift-System)  │ │
│  │                  │                   │                  │ │
│  │ • Drift 3D       │                   │ • Support Panel  │ │
│  │   (Arcade, 5min) │                   │   (Help)         │ │
│  │                  │                   │                  │ │
│  │ • Boss-Fight     │                   │ • Support Thread │ │
│  │   (Strategy, 10min)                  │   (Community)    │ │
│  │                  │                   │                  │ │
│  │ • Zoo-Wordle     │                   │                  │ │
│  │   (Trivia, 3min) │                   │                  │ │
│  │                  │                   │                  │ │
│  └──────────────────┴──────────────────┴──────────────────┘ │
│                                                               │
│  META:                                                       │
│  • Settings (Sprache, Sound, DarkMode)                      │
│  • Privacy & Terms                                           │
│  • Roadmap (Was kommt bald?)                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📌 Feature-Details nach Zielgruppe

### Für Neulinge (Tag 1–7)

**Phase 1: Farm-Loop (Minute 0–5)**

- **GameView:** Tier-Tappen, Coins sammeln
- **Ziel:** Instant-Feedback (Tap → Coin-Zahl ↑)
- **Psychological Trigger:** "Ich mache Fortschritt!"

**Phase 2: Shop-Loop (Minute 5–15)**

- **ShopView:** Erstes Tier kaufen (Küken)
- **Ziel:** Progress-Gate (50 Coins für Huhn = nächstes Ziel)
- **Psychological Trigger:** "Ich collecte!"

**Phase 3: Minigames (Minute 15–30)**

- **WordleGameView:** Erstes Minigame (einfach)
- **MemoryGameView:** Zweites (kompetitiv)
- **Ziel:** Variety (Farm ist Chill, Minigames sind Spice)
- **Psychological Trigger:** "Es gibt viel zu tun!"

**Phase 4: Social (Tag 2–3)**

- **LeaderboardView:** Andere Spieler sehen
- **Ziel:** FOMO (Andere spielen auch, ich bin nicht allein)
- **Psychological Trigger:** "Möglicher Wettkampf!"

**Phase 5: Trading (Tag 4–5)**

- **TradeView oder SendView:** Mit Freunden interagieren
- **Ziel:** Ownership (Meine Tiere, meine Coins haben Wert für andere)
- **Psychological Trigger:** "Social Currency!"

**Nicht zu früh (würde überwältigen):**
- ❌ WorldView (komplexe 3D, viele andere Avatare)
- ❌ BossFightView (braucht Strategie, ist frustrierend für Anfänger)
- ❌ Parkour/Drift 3D (Skill-Barrier zu hoch)
- ❌ TicketsView (Advanced Quest-System)

---

### Für Bestehende Spieler (Woche 2+)

**Mid-Game (Woche 2–4):** 8–15 Tiere

- **Boss-Fight:** Erste Strategie-Schicht (Welche Tiere sende ich?)
- **Safari-Eggs:** Replayability (Kann ich "Golden Chicken" finden?)
- **World-Visits:** Soziale Tiefe (Andere Spieler live sehen)
- **Friend-Leaderboard:** Competitive Depth (Wer von meinen Freunden ist führend?)

**Late-Game (Monat 2+):** 20+ Tiere, alle Minigames Veteran

- **Endless-Boss:** Scoring-System (Wie lange kann ich durchhalten?)
- **Memory-Online:** Co-op Tournaments (mit echten Freunden spielen)
- **Zoo-Wordle:** Trivia-Turnier
- **Support-Panel:** Community-Engagement (Anderen helfen, Stories teilen)

---

## 🔄 Feature-Abhängigkeiten

```
                       ┌─────────────────┐
                       │ Auth / Profile  │ (Everyone)
                       └────────┬────────┘
                                │
                       ┌────────▼────────┐
                       │  GameView Farm  │ (Day 1, required)
                       └────────┬────────┘
                                │
                   ┌────────────┼────────────┐
                   │            │            │
        ┌──────────▼──┐  ┌──────▼──────┐  ┌─▼──────────────┐
        │  ShopView   │  │  Minigames  │  │ OfflineEarning │
        │ (Buy Tiers) │  │ (Wordle)    │  │    (passive)   │
        └──────┬──────┘  └──────┬──────┘  └────────────────┘
               │                │
        ┌──────▼────────┐  ┌────▼──────────┐
        │  LeaderBoard  │  │  MemoryGame   │
        │  (see others) │  │  (1st minigame)
        └──────┬────────┘  └────┬──────────┘
               │                 │
        ┌──────▼──────────────────▼──────┐
        │      TradeView / SendCoins     │
        │  (Social Economy, Week 1)      │
        └──────┬───────────────────┬─────┘
               │                   │
        ┌──────▼──────┐     ┌──────▼────────┐
        │ WorldView   │     │ BossFightView │
        │ (Presence)  │     │ (Strategy)    │
        └─────────────┘     └──────┬────────┘
                                   │
                           ┌───────▼─────────┐
                           │ Parkour/Drift 3D│
                           │ (Advanced, Week2)
                           └─────────────────┘
```

---

## 💡 Psychologische Loops by Feature

### Farm (Core Loop)

**Mechanic:** Tap → Coin += X  
**Psychological Hook:** **Skinner Box** (immediate reward)  
**Duration:** Infinite (returns daily)  
**Engagement Driver:** Progress-Bars (X Coins bis nächstes Tier)

**Churn Risk:** Wird langweilig wenn kein Tier-Neukauf in 3 Tagen  
**Mitigation:** Offline-Earnings (passives Income) + Minigame-Breaks

---

### Minigames (Variety Loop)

**Mechanic:** Spielen → Coins/Tickets verdienen  
**Psychological Hook:** **Skill-Based Progression** (werde besser, verdiene mehr)  
**Duration:** 2–10 min pro Session  
**Engagement Driver:** Leaderboards, wöchentliche Boss-Fights

**Churn Risk:** Alle 5 Minigames gelöst? Monotonie!  
**Mitigation:** Turnier-Rotationen, neue Events, Difficulty-Skala

---

### Leaderboard (Competitive Loop)

**Mechanic:** Coins verdienen → Ranking steigen  
**Psychological Hook:** **Social Comparison** (Andere sehen, Wettkampf)  
**Duration:** Asynchron (passives Ranking)  
**Engagement Driver:** Weekly resets, "Close race" Highlights

**Churn Risk:** Führende Spieler unantastbar → Newcomer demoralisiert  
**Mitigation:** Brackets (Anfänger vs. Profis) oder wöchentliche Resets

---

### Trading / SendCoins (Social Loop)

**Mechanic:** Tiere/Coins mit Freunden austauschen  
**Psychological Hook:** **Social Proof** (Gemeinsames Ziel, gegenseitige Hilfe)  
**Duration:** Asynchron (Gift warten auf Annahme)  
**Engagement Driver:** Gift-Notifs, "Friend is helping me" Message

**Churn Risk:** Solo-Player fühlt sich isoliert  
**Mitigation:** NPC-Freunde (Bot) die Geschenke senden, oder automatische Matching

---

### World (Presence Loop)

**Mechanic:** Andere Spieler im Zoo sehen, Emotes senden  
**Psychological Hook:** **FOMO** (Wer ist gerade online?)  
**Duration:** Real-Time Presence (~7Hz bei Movement)  
**Engagement Driver:** Rare Encounters (Legendäre Spieler treffen)

**Churn Risk:** "World ist leer" = Spieler verlassen  
**Mitigation:** Fake-Bots wenn <10 aktive Spieler (sollten nicht sichtbar sein)

---

### Tickets / Quests (Goal-Setting Loop)

**Mechanic:** Tägliche/Wöchentliche Quests mit Rewards  
**Psychological Hook:** **Goal Clarity** ("Das brauche ich zu tun")  
**Duration:** Strukturiert (Daily Reset 0:00 UTC)  
**Engagement Driver:** Milestone-Bonuses ("3 Quests = Freier Boss-Token")

**Churn Risk:** Quests zu schwer → Frustration  
**Mitigation:** Adaptive Difficulty (Easy/Medium/Hard) oder Skip-Option

---

## 🎯 Next Steps (Implementierungs-Roadmap)

### Kurzfristig (nächste 2 Wochen)

1. **Onboarding Tooltips:** Progressive Disclosure einbauen
   - Datei: `GameView.vue` (show-Tutorial basierend auf `game.isNewPlayer`)
   
2. **Feature-Unlock-Trigger:** Basierend auf Zeit/Coins
   - Dateien: `GameView.vue`, `game.js` (Store)

3. **Retention-Notifs:** Boilerplate für Push-Notifs
   - Datei: `main.js`, `src/notifications.js` (neu)

### Mittelfristig (nächste 4 Wochen)

4. **Boss-Fight Balancing:** Wöchentliche Rotation statt Static
   - Datei: `BossFightView.vue`, Supabase `boss_schedule` (neue Tabelle)

5. **Friend-Leaderboard:** Separate Leaderboard für Freunde
   - Dateien: `LeaderboardView.vue`, Supabase RPC `get_friend_leaderboard`

6. **World-Bots:** Fake-Bots bei < 10 Online-Spielern
   - Dateien: `WorldView.vue`, Supabase RPC `world_fake_players`

### Langfristig (nächste 8 Wochen)

7. **Event-Calendar:** Monatliche Events (Spooky, Holiday, etc.)
   - Neue Feature-Branches pro Event

8. **A/B Testing Framework:** Notif-Timing, Shop-Sorting testen
   - Neue Tabelle `experiments`, `src/experiments.js`

9. **Analytics Dashboard:** Churn-Risiko tracken
   - Supabase Real-Time + `src/analytics.js`

---

## 🧪 Testing-Checkliste

Bevor ein Feature "ship-ready" ist:

- [ ] **Newcomer**: Kann ein brandneuer Spieler in <20 min 3 Tiere kaufen?
- [ ] **Mobile**: Alle Buttons >= 48px, Scrolls smooth?
- [ ] **Offline**: App startet ohne Internet, Coins sichtbar?
- [ ] **Performance**: Minigame lädt in <2s auf 3G?
- [ ] **i18n**: Deutsche Umlaute korrekt (ä ö ü ß), keine Hängenden Texte?
- [ ] **A11y**: Screen-Reader kann Buttons finden, Farben kontrastreich?
- [ ] **Edge Cases:** Was wenn kein Geld? Was wenn Netzwerk weg?

---

## 📚 Siehe auch

- `docs/superpowers/strategy/2026-09-16-newcomer-onboarding.md`
- `docs/superpowers/strategy/2026-09-16-player-retention.md`
- `docs/superpowers/specs/` — Detaillierte Feature-Specs
- `AGENTS.md` — Technische Architektur
