# Onboarding & Retention Roadmap 2026

## Ziel
Zoo Empire für **Neulinge intuitiv und lohnend** gestalten sowie **bestehende Spieler** durch regelmäßige neue Inhalte und sichtbare Progression halten.

## I. Situation Analysis

### Stärken (Current State)
- ✅ Rich Minigame-Portfolio (Memory, Drift, Parkour, Wordle, BlockFall, Halloween)
- ✅ Wirtschaftssystem mit Tieren, Tiers, Züchtung, Börse
- ✅ Zoo-Welt mit Live-Multiplayer
- ✅ Event-basiert (Halloween, Deko) → zeitliche Urgency
- ✅ Gift für Neuspieler bereits im Code

### Herausforderungen
- 🔴 **Komplexität**: 27 Routen, viele Systeme gleichzeitig
- 🔴 **Retention**: Keine klare "Verlockung" für Rückkehrer
- 🔴 **Progression**: Neulinge sehen Tiers/Züchtung/Börse nicht sofort als "für mich"
- 🔴 **FOMO-Balance**: Halloween ist zeitlich, aber andere Inhalte wirken "always on"

---

## II. Neulinge (Tag 0–7)

### 📋 Phase 1: Kritischer Moment (Erste 5 Minuten)

**Problem**: Zu viele Knöpfe, unklar wo anfangen.

**Lösungen**:
1. **Interactive Tutorial Path** (Modal-Serie):
   - "Willkommen! Lass' dein erstes Tier kaufen" → Shop öffnet mit Filter "Anfänger"
   - "Jetzt tippe auf dein Tier" → GameView, rotes Puls-Icon auf Liebling
   - "Verdiene Münzen + Taps" → erklärt Multiplikator
   - Jede Sektion: `[Nächste]`-Button, `[Skip]`-Fallback

2. **Reduced Initial UI**:
   - Tabs unten: nur `[TAP]`, `[SHOP]`, `[GAMES]` zeigen (Rest ausgeblendet bis Level 10+)
   - Quick-Actions: nur die 3 gefeatürten Minigames (leichteste zuerst)
   - Banner: "🎁 Bonus-Taps hier abholen" → Gift-Modal

3. **Smart Defaults**:
   - Geschenk: +100 Bonus-Taps (statt klein)
   - Erste 3 Tiere kostenlos (statt käuflich)
   - Startgeld: 500 Coins (Spielraum für Experimente)

**Implementation**: `src/components/TutorialPath.vue`, Flag `tutorial_seen` in Profil

---

### 📈 Phase 2: First Wins (Tag 1–2)

**Ziel**: Spieler sollen sich "kompetent" fühlen.

1. **Early Milestone Rewards**:
   - 10 Taps gesammelt → +20 Bonus-Taps
   - 1. Minigame gewonnen → +25 Tickets
   - 5 verschiedene Tiere im Inventar → Chest unlock
   - Erreichen: Toast + Feuerwerk (zufriedenstellendes Feedback)

2. **Visible Progression Bar**:
   - Neue UI-Komponente: "Dein Fortschritt" mit 5 Checkpoints
   - `[✓] Shop erkundet` → `[✓] Erstes Minigame` → `[ ] 50 Münzen verdient` → etc.
   - Neulinge erhalten `completed: 2/5` beim Start

3. **Passive Income Teaser**:
   - "Passives Einkommen" wird in Upgrades sofort beworben
   - Tooltip: "Deine Tiere verdienen auch, wenn du weg bist!"
   - Nach 30 Minuten: Banner "Du hast offline verdient: +50 Coins" → Spannung aufbauen

**Implementation**: `src/composables/useMilestones.js`, Migration für `milestones_completed`

---

### 🎯 Phase 3: Hook für Wiederholung (Tag 3–7)

**Problem**: Warum sollte ein Spieler zurückkommen?

**Lösungen**:

1. **Daily Reward Redesign**:
   - Aktuell: Simple Coins/Tickets
   - Neu: Progressing Calendar (Tag 1→7 mit Rewards-Kurve)
   - Tag 7: Rare Egg / Tier-Token (wertvoll!)
   - **Streak-Mechanic**: "7 Tage = Bonus!" (starte Woche neu, wenn verpasst)

2. **Time-Gated Content Tease**:
   - Premium-Tier "Nächstes Event" teaser oben in GameView
   - "🎃 Halloween endet in 3 Tagen — hole die Fledermaus!" (wenn Halloween aktiv)
   - Oder: "🎄 Weihnachtsevent startet in 10 Tagen"

3. **Social Hooks** (für Tag 7):
   - "Lade einen Freund ein" → Beide erhalten +50 Coins
   - Friends-Tab vorgestellt in Tutorial
   - Einfacher Share-Link im Profil

**Implementation**: `DailyRewardModal` update, neue Migration für `daily_streaks`

---

## III. Bestehende Spieler (Retention Loop)

### 🔄 Engagement Cycle (Wöchentlich)

1. **Montags: Event Announcement**
   - Neuer Content oder Event-Kick-off
   - In-Game Modal + Support Tab Notiz

2. **Dienstags–Donnerstags: Soft Content**
   - Neue Tier-Releases (1–2 pro Woche)
   - Market-Trend Updates (Spiegel-Posts)
   - Freundschafts-Challenges ("Wer hat mehr Taps diese Woche?")

3. **Freitags: Weekend Boost**
   - "Wochenend-Multiplier" +20% Coins
   - Bonus-Tickets in Minigames
   - Neue Cosmetics im World Shop

4. **Sonntags: Reflection**
   - Persönlicher Stats-Report ("Diese Woche: 5M Coins verdient, 12 Tiere gezüchtet")
   - Leaderboard-Position-Update
   - Preview nächster Woche

**Implementation**: 
- `EventSchedule` erweitern in `src/eventSchedule.js`
- Migration für `weekly_stats` Tabelle

---

### 🎁 Retention Mechanics

#### A. **Breeding Lottery** (Variant: Brütungs-Überraschung)
- Problem: Züchtung dauert lange, ist "passiv"
- Lösung: Kleine Chance (5%) auf "Bonus-Baby" (seltenere Variante)
- Hook: Spieler schauen öfter vorbei zu sehen "ob etwas Besonderes passiert"

#### B. **Market Crashes & Rallies**
- 1× pro Woche: Ein Tier steigt (Hype) oder fällt (Flash-Sale)
- Benachrichtigung: "🦁 Löwe +30% — Jetzt verkaufen?"
- Treibt aktives Marktet-Engagement

#### C. **Seasonal Cosmetics Track**
- Monthly cosmetics (nicht Shop-exklusiv):
  - Anfang: Free "Beginner"-Skin
  - Mitte: Paid "Premium"-Skin (2000 Coins)
  - Ende: "Grind-Reward" (50k taps = unlock)
- Visuelle Belohnung für Dedication

#### D. **Leaderboard Decay**
- Position sinkt, wenn 1 Woche inaktiv
- "Du rutschst ab!" Benachrichtigung
- Hook: Kurzer Boost-Session bringt dich zurück hoch

---

### 💎 Special Events (Monthly)

1. **Tournaments** (Minigame-basiert)
   - Wer's beste Zeit in Parkour? Pokal + 500 Coins
   - Score speichern (nicht Client, sondern Server per RPC)

2. **Limited-Time Tiers**
   - "Gold-Löwe" nur im Sept (1% Chancen-Boost)
   - Exclusivity treibt Engagement

3. **Collaborative Goals**
   - "Community Challenge": Alle Spieler zusammen 1B Coins verdienen
   - Bonusrewards alle 100M Coins
   - Schaff's in einer Woche = "Rare Egg" für alle

---

## IV. Platform-Specific Hooks

### 📱 Mobile (Capacitor/Android)
- **Push Notifications**:
  - "Dein Offline-Einkommen wartet! 🏦 +2.3M Coins"
  - "Event endet bald 🎃" (1 Tag vorher)
  - "Freund hat dir einen Chall geschickt 🏁"
  
- **Home Screen Widgets** (Android 12+):
  - Quick "Open for Coins" widget
  - Daily-Reward countdown

### 🌐 Web
- **Browser Notifications**:
  - Nur wenn "Wichtig" (Event-Ende, Freund-Einladung)
  - No spam (max 1/pro Tag)

---

## V. Implementation Roadmap

### 🔵 Sprint 1 (Now–Oct 20)
- [ ] Tutorial Path (Phase 1)
- [ ] Milestone System (Phase 2)
- [ ] Daily Reward Calendar
- Estimates: 3d Frontend + 1d Backend

### 🟢 Sprint 2 (Oct 21–27)
- [ ] Weekly Event Schedule
- [ ] Breeding Lottery
- [ ] Market Crash/Rally Mechanics
- Estimates: 2d + 1d

### 🟡 Sprint 3 (Oct 28–Nov 3)
- [ ] Seasonal Cosmetics Track
- [ ] Leaderboard Decay
- [ ] Collaborative Goals
- Estimates: 2d + 2d

### 🔴 Sprint 4+ (Ongoing)
- Tournaments, Limited Tiers, Mobile Notifications

---

## VI. Metrics to Track

```sql
-- Day 1 Retention
SELECT 
  DATE(created_at) as signup_date,
  COUNT(*) as signups,
  SUM(CASE WHEN last_seen > created_at + '1 day'::interval THEN 1 ELSE 0 END)::float / COUNT(*) as d1_retention
FROM profiles
GROUP BY DATE(created_at);

-- Feature Adoption
SELECT feature_name, COUNT(DISTINCT user_id) as users, AVG(sessions_used) as avg_sessions
FROM feature_usage
GROUP BY feature_name
ORDER BY users DESC;

-- Churn Signals
SELECT user_id, last_seen, coins_earned_7d, taps_total, breeding_count
FROM profiles
WHERE last_seen < NOW() - '3 days'::interval
  AND created_at < NOW() - '7 days'::interval
ORDER BY last_seen DESC;
```

---

## VII. Testing & Validation

### A/B Tests (Proposed)
1. **Gift Size**: 100 vs. 200 Bonus-Taps → D1 Engagement
2. **Tutorial Flow**: Modal vs. In-Game Bubbles → Completion Rate
3. **Daily Calendar**: Current vs. Progressing → Streak Length

### QA Checklist
- [ ] New Player (Account age 0–1 day) sees only Tutorial + TAP/SHOP/GAMES
- [ ] Milestone badges award on correct triggers
- [ ] Daily Streak resets only if 24h+ gap
- [ ] Offline income correctly mirrors `offline_income` setting
- [ ] Events show correct end dates in all timezones

---

## VIII. Design Notes for UI Components

### Colors & Tokens
- Milestone badges: `--accent` (Gold)
- Event teasers: `--accent-2` (Purple/Secondary)
- Retention warnings: `--danger` (Red)
- All follow existing Design System (see `docs/superpowers/specs/2026-09-27-dark-mode-eier-maschine-design.md`)

### Responsiveness
- Modals max-width 560px (App-Shell standard)
- Daily Calendar: swipe-able on mobile
- Event teasers: collapsible on small screens

---

## IX. Future Iterations

- **Guilds**: Team-based goals + leaderboards
- **Trading Post**: Direct P2P gear exchange (not just animals)
- **Seasonal Pass**: "Battle Pass"-like progression (free + premium)
- **Deep Links**: Share achievements / challenge friends with deep URLs

---

## Conclusion

Durch **gezieltes Onboarding** (Phasen 1–3) und **wöchentliche Engagement-Cycles** mit **zeitlich begrenzten Events** halten wir Spieler bei der Stange. Der Fokus liegt auf **sichtbarer Progression**, **sozialen Hooks** und **regelmäßigen Überraschungen**.

**Next Step**: Spec für Tutorial Path schreiben + mit UI/UX reviewen.
