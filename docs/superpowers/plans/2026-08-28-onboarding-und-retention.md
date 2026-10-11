# Onboarding & Retention — Strategie für Newcomer & Bestandsspieler

**Datum:** 2026-08-28  
**Autor:** Claude  
**Status:** Proposal für Diskussion

## Executive Summary

Zoo Empire hat eine solide Feature-Breite (Parkour, Drift, Wordle, Memory, Bossläufe, 3D-Welt, Marktplatz). Um langfristig zu wachsen, braucht es:

1. **Für Newcomer:** Klarer Einstiegs-Pfad, verständliches Tutorial, schnelle erste Erfolgsmomente.
2. **Für Bestandsspieler:** Neue Content-Häufigkeit, Ziele (Dauer-Challenges), Soziales (Clans/Events), Progression Visibility.
3. **Monetarisierung:** Premium-Cosmetics, Battle Pass, optionale Speeding-ups.

---

## 1. Onboarding für Newcomer (Tage 1–3)

### Problem
- Game startet direkt in GameView (Farm) – Neulingen ist unklar, was sie tun sollen.
- Zu viele Menüpunkte, uneindeutige Priorität.
- Kein erklärendes Tutorial, kein "Quick Win" in den ersten 2 Minuten.

### Lösungen

#### 1.1 Interaktives First-Run Tutorial
**Scope:** Neue Route `/onboarding` oder Modal in GameView
- **Schritt 1 (30s):** "Willkommen in Zoo Empire! Du sammelst Tiere und verdienst Coins."
  - Zoome auf erstes Tier, highlight Tap-Bonus Button.
- **Schritt 2 (1m):** "Tiere verdienen passiv Coins. Mehr Tiere = mehr Einkommen."
  - Schau andere Tiere an, highlight Shop.
- **Schritt 3 (2m):** "Nutze Minigames um schneller zu verdienen!"
  - Link zu Parkour/Drift/Wordle mit kurzen Video-Clips (3s GIFs).
- **Schritt 4 (3m):** "Triff andere Spieler in der Zoo-Welt oder handel im Marktplatz."
  - Showcase World & Trade Views.

**Tech:**
- Overlay-Komponente mit Pfeilen/Highlights über Ziel-UI.
- `localStorage` Flag `hasSeenOnboarding` für Repeat-Control.
- I18N (de/en/ru) mit lokaler Strings wie im WorldView-Muster.

**Success-Kriterium:** Newcomer absolvieren Tutorial & starten 1. Minigame am Day 1.

---

#### 1.2 "First Achievements" – Visible Quick Wins
**Scope:** Neue `achievements.js` + Achievement-Popups

Erste freischaltbare Achievements (keine Punkte, nur Dopamin-Hits):
- "First Tap" – Tippe ein Tier an.
- "First Coin" – Verdiene 100 Coins (garantiert nach ~10–20s).
- "First Shop Visit" – Öffne den Shop.
- "First Animal Bought" – Kaufe dein zweites Tier.
- "First Minigame" – Starte & beende Parkour/Drift/Wordle (3 separate Achievements).

**Tech:**
- `src/achievements.js`: Array von Definitions + `checkAchievement(key, context)`.
- `useAchievements()` Composable mit RPC `claim_achievement` (Coins als Reward).
- Toast/Modal-Popup "🏆 Achievement: First Tap!" mit +10 Coins.

**Success-Kriterium:** Newcomer sehen **4–5 Achievements** in den ersten 24h.

---

#### 1.3 Newcomer-Boosted Economy (First 2 Tage)
**Scope:** Economy-Adjustments für neue Spieler

- **First 10 Taps:** 2× Coins (statt 1×).
- **First 2 Tier-Käufe:** 20% Rabatt.
- **Freie Minigame-Runs:** Erste 3 Runs pro Spiel am Day 1 völlig kostenlos (statt Ticket).

**Tech:**
- In `ShopView`: Check `created_at` via `useAuthStore()`, wende Discount via `p_new_player_discount`.
- In Minigame-Views: Track Runs, gib erste 3 Runs kostenlosen Zugang.

**Success-Kriterium:** Newcomer-Retention Day 1→Day 2 steigt um 15–20%.

---

## 2. Bestandsspieler – Content & Engagement (Langzeit)

### Problem
- Keine neuen Tiere seit längerer Zeit → Progression stagniert.
- Minigames sind optioniert, aber "was ist die beste ROI?".
- Keine Community-Events, keine gemeinsamen Ziele.

### Lösungen

#### 2.1 Seasonal Pass (Premium-Feature)
**Scope:** Neue Route `/seasonpass` oder Modal

Monatlicher Battle Pass-artig:
- **Kostenlos:** 20 Rewards (Coins, Cosmetics, Tickets).
- **Premium (499 coins):** 40 Rewards + Premium Cosmetics (Skins, Emotes).

**Struktur:**
- 5 Tiers × 4 Wochen = 20 Progression-Punkte (= Wins in Minigames).
- Wöchentliche Herausforderungen: "Verdiene 50k Coins", "Gewinne 5 Drift-Races", "Triff 10 andere Spieler in der Welt".

**Tech:**
- `seasonal_pass` Tabelle (user_id, season, tier, premium, expires).
- RPC `seasonal_pass_claim_reward(p_tier)` mit Validation.
- Pass-Progress-Berechnung: `SELECT COUNT(*) FROM achievements WHERE user_id = ? AND created_at > season_start`.

**Success-Kriterium:** 20–30% Premium-Konversion, 2–3× längere Sessions bei Pass-Spielern.

---

#### 2.2 Neue Tier-Linie (Q3/Q4)
**Scope:** 3–4 neue Tier-Spezies

Nach Dragon aktuell: Was kommt nächstes?

**Optionen:**
- **Mythische Reihe:** Phoenix, Einhorn, Chimäre, Leviathan.
  - Preise: 500M, 2B, 10B, 50B coins.
  - Passive Income: 2M, 10M, 50M, 250M coins/sec.
  - Freigeschaltet: Nach Dragon gekauft.

- **Hybrid-Tiere:** (Sammlung von 2 bestimmten Tieren → synthesiere 1 neues)
  - z. B. Pferd + Tiger = Tigerpferd.
  - Belohnung: Extra-Cosmetics, Unique emote.

**Tech:**
- `src/animals.js`: + 4 neue Einträge.
- Optional: `animal_synthesis` Tabelle + RPC für Hybriden.
- UI in ShopView: Tab "Mythical" + "Fusion" mit Visual-Guides.

**Success-Kriterium:** Spieler spielen 15–30 Tage länger um alle neuen Tiere zu entsperren.

---

#### 2.3 Clan-System (Q3)
**Scope:** Neue Route `/clans`

Kleine Gilden (bis 20 Spieler):
- **Gründen:** 50k Coins, custom Name + Logo (Emoji).
- **Features:**
  - Shared Treasury (Coins reinwerfen, Leader verteilt).
  - Clan-Challenges: "Kombiniert 500k Coins verdienen" → alle kriegen Bonus (z. B. +50k).
  - Clan-Leaderboard: Top Clans monatlich gehighlight.

**Tech:**
- `clans` Tabelle (id, name, logo_emoji, creator_id, treasury_coins, created_at).
- `clan_memberships` (user_id, clan_id, role: member|officer|leader).
- RPC `create_clan`, `join_clan`, `clan_contribute`, `clan_claim_challenge_reward`.

**Success-Kriterium:** 30–40% Spieler treten Clan bei → 25% höhere 30-Day Retention.

---

#### 2.4 Tägliche/Wöchentliche Challenges
**Scope:** Widget in GameView

Ersetze/ergänze "Check back tomorrow"-Screens mit echten Rewards:

**Täglich:**
- "Verdiene 50k Coins": +5 Tickets.
- "Spielen 3 Minigames": +1 Tier-Egg (zufällig).
- "Visit 3 other players' Worlds": +10k Coins.

**Wöchentlich:**
- "Gesamte Coins verdient ≥ 500k": +1 Premium Cosmetic (Outfit/Car).
- "Gewinne 15 Minigame-Runs": +2 Eggs.

**Tech:**
- `daily_challenges`, `weekly_challenges` Tabellen.
- RPC `claim_daily_challenge(p_challenge_key)` mit Progress-Check.
- Widget in GameView zeigt "3/5 runs this week" mit Progress-Bar.

**Success-Kriterium:** 50%+ Daily Engagement (tägl. Login), +40% Session-Länge.

---

## 3. Progression Visibility & Motivation

### Problem
- Langziel unklar: "Was arbeite ich hin?"
- Keine Zusammenfassung: Wie viel habe ich schon verdient? Welcher Rang bin ich?

### Lösungen

#### 3.1 Lifetime Stats Dashboard
**Scope:** Expanded ProfileView

Zeige:
- Gesamte Coins verdient (je Quelle: Tiere/Minigames/Challenges).
- Tage gespielt, Tier-Anzahl, Win-Streak (Minigames).
- Ranking gegen andere Spieler (globale Percentile).

**Tech:**
- Neue RPC `get_player_stats(p_user_id)` mit aggregiertem COUNT/SUM.
- View-Komponente mit Charts (Recharts/Simple SVG).

**Success-Kriterium:** Spieler kehren zu ProfileView zurück, um Fortschritt zu sehen → Social-Sharing-Impulse.

---

#### 3.2 Next Tier Milestone
**Scope:** Hero-Card in GameView

Zeigt nächstes Tier, das gekauft werden kann:
```
[Nächstes Ziel]
🐯 Tiger - nur noch 2.1M Coins entfernt
████████░░ (80% Progress)
Verdiene 2M Coins in Minigames um zu beschleunigen!
```

**Tech:**
- `computed` in GameView: `nextAffordable = animals.find(a => a.cost > game.coins)`.
- Progress-Bar mit `(game.coins / nextAffordable.cost) * 100`.

**Success-Kriterium:** Spieler wissen immer ihr nächstes Ziel → Motivation steigt.

---

## 4. Social Features & Virality

### Problem
- World ist schön, aber wenig Motivation um Zeit dort zu verbringen.
- Keine Gründe, Freunde zu laden.

### Lösungen

#### 4.1 Friend Referral Bonus
**Scope:** Settings → "Invite Friends"

- **Du erhältst:** +50k Coins wenn Freund 7 Tage spielt.
- **Freund erhältst:** +20k Bonus Start-Coins.
- Link: `zoo-empire.app?ref=USERNAME` mit Tracking.

**Tech:**
- `referrals` Tabelle (referrer_id, referred_id, created_at, claimed).
- RPC `track_referral` beim Signup mit ref-Query-Param.

**Success-Kriterium:** 10–15% neue Spieler via Referral-Link.

---

#### 4.2 Emote-Reactions im World (Social Gamification)
**Scope:** WorldView Enhancement

Andere Spieler sehen deine Emotes + können reagieren:
- Du: 👋 bei Brunnen.
- Anderer Spieler: ❤️ als Reaktion (kostet 0, nur Spaß).
- "X likes your emote!" Toast.

**Tech:**
- Broadcast-Kanal `world:lobby` + neue Message-Type `emote_reaction`.
- DB-Tracking optional (für Leaderboard später).

**Success-Kriterium:** Spieler verbringen +5min/Tag in der Welt, mehr Multi-Player-Interaktionen.

---

## 5. Monetization Path (Optional, für Sustainabilität)

### Keine Pay-to-Win, sondern Cosmetics + Convenience:

1. **Premium Battle Pass:** 499 coins/Monat → +40 Rewards, exclusive skins.
2. **Cosmetic Bundles:** Auto-Skins, Outfit-Packs (499–2999 coins).
3. **Season Pass Cosmetics:** Unique emotes, limited-time animal skins.
4. **No Time-Gating of Economy:** Coins/Tickets verdienen immer, Premium nur Optik + etwas Convenience.

---

## 6. Implementation Roadmap

### Phase 1 (Week 1–2, "Quick Wins")
- [ ] Onboarding Tutorial + First Achievements
- [ ] First-Time Player Boosted Economy
- [ ] Lifetime Stats Dashboard
- [ ] Next Tier Milestone Card

**Impact:** +20% Day 1 Retention, +10% Day 7 Retention.

### Phase 2 (Week 3–4, "Engagement Loops")
- [ ] Daily/Weekly Challenges
- [ ] Seasonal Pass Framework (ohne Premium-Paywall zum Start)
- [ ] Friend Referral System
- [ ] Emote Reactions in World

**Impact:** +40% Daily Engagement, +25% Session Length.

### Phase 3 (Q3, "Content")
- [ ] 3–4 neue Tier-Spezies (Mythical Line)
- [ ] Clan-System
- [ ] Premium Battle Pass Activation
- [ ] Cosmetic Shop Expansion

**Impact:** +60% Week 4+ Retention, Launch Monetization.

### Phase 4 (Q4, "Polish")
- [ ] Seasonal Events (Halloween, Weihnacht, Neujahr)
- [ ] Limited-Time Challenges
- [ ] Community-Voting für nächste Features (via Roadmap)

---

## 7. Success Metrics

| Metrik | Baseline | Ziel (nach Phase 3) | Owner |
|---|---|---|---|
| Day 1 Retention | ~35% | ~50% | Onboarding |
| Day 7 Retention | ~15% | ~30% | Engagement |
| Daily Active Users (DAU) | — | +40% | Challenges |
| Avg Session Length | ~8 min | ~15 min | Content |
| Tier-Diversity (Avg Tiere/Player) | 3.5 | 5.2 | New Animals |
| Premium Conversion Rate | — | 20–25% | Battle Pass |

---

## 8. Open Questions & Risks

### Questions
1. Ist Battle Pass-Monetization gewünscht, oder bleibt alles F2P?
2. Clan-Kapazität: Sollte es auch größere Allianzen geben?
3. Should seasonal content rotate oder Permanant bleiben?

### Risks
- **Scope Creep:** Alle Phasen umzusetzen dauert 10–12 Wochen. Priorisieren.
- **Fragmentation:** Zu viele Features → Newcomer Overload. Start mit Onboarding + Challenges.
- **Economy Balance:** Mythical Tiere & neue Challenges müssen calibriert werden, sonst Boredom oder Grindfest.

---

## Anhang: Beispiel-Implementierungs-Skelette

### Beispiel: Daily Challenge RPC
```sql
-- supabase/migrations/20260828_challenges.sql
create table daily_challenges (
  id serial primary key,
  key text unique not null,
  description text not null,
  reward_coins int default 0,
  reward_tickets int default 0,
  created_at timestamp default now()
);

create table user_challenge_progress (
  user_id uuid not null,
  challenge_key text not null,
  progress_current int default 0,
  progress_target int not null,
  claimed bool default false,
  created_at date default now(),
  primary key (user_id, challenge_key, created_at)
);

create or replace function claim_daily_challenge(p_challenge_key text)
returns jsonb as $$
  ...
$$ language plpgsql security definer set search_path = public;
```

### Beispiel: First Achievement
```js
// src/achievements.js
export const ACHIEVEMENTS = {
  firstTap: {
    key: 'firstTap',
    title: { de: 'First Tap', en: 'First Tap', ru: 'Первый тап' },
    description: { de: 'Tippe dein erstes Tier an.' },
    reward: { coins: 10 }
  },
  // ...
}

// In GameView.vue
function onAnimalTap(animalId) {
  game.coins += game.getTapBonus()
  checkAchievement('firstTap', { animalId })
}
```

---

## Fazit

Zoo Empire hat ein **großes Feature-Set**, aber **Struktur für Newcomer und Engagement-Loops für Bestandsspieler fehlen**. Diese Roadmap adressiert:

- ✅ Klarer Einstieg (Onboarding + Quick Wins).
- ✅ Sichtbare Progression (Stats, Challenges, Pass).
- ✅ Neue Content-Häufigkeit (Tier, Events, Cosmetics).
- ✅ Social & Community (Referrals, Clans, World-Interaktion).

**Beginn mit Phase 1** (2–3 Wochen), messbar. Danach iterieren basierend auf Analytics.
