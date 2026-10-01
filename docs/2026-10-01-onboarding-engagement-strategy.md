# Zoo Empire — Onboarding & Engagement Strategy 2026

**Date:** 2026-10-01  
**Goal:** Make Zoo Empire cool & engaging for new players (Day 1-7) and retain existing players (retention loop).

---

## Executive Summary

Zoo Empire is a feature-rich idle game with **10+ minigames, breeding, trading, world exploration, and competitive ranking**. However, the onboarding funnel is unclear:

- **Problem:** New players don't know what to do after buying their first animal.
- **Opportunity:** 19 distinct features (shop, market, breeding, drift, parkour, memory, blockfall, boss fights, wordgame, etc.) are hidden behind navigation complexity.
- **Solution:** Guided progression path + habit-forming loops + achievement milestones.

**Next Steps Priority:**
1. ✨ **Tutorial/Onboarding Flow** — First 10 minutes: teach coins, animals, passive income, minigames.
2. 🎯 **Daily Quests** — Reward regular login + engagement with the core loop.
3. 🏆 **Achievement System** — Milestone badges (first animal, first ticket, breeding, ranking top 100).
4. 📊 **Analytics/Funnels** — Measure drop-off, retention, and feature adoption.

---

## Current State: Feature Map

### Core Loop (Passive Income)
- Buy animals → earn coins passively → upgrade/buy more → repeat
- Offline earnings up to 8h
- Server-authoritative economy via Supabase RPC

### Minigames (Active Coins/Tickets)
- **Drift** — Racing game, coins reward
- **Parkour** — Obstacle course, coins reward
- **Memory** — Tile matching, single & multiplayer
- **Blockfall** — Tetris-like, coins reward
- **Wordle** — Guess word, coins reward
- **BossFight / BossPath** — Combat progression, high coins/tickets
- **EndlessBoss** — Arcade-style, leaderboard

### Economy
- **Shop** — Buy animals (10 species, tier 1+)
- **Breeding** — Combine 2 animals → new eggs (higher tier)
- **Market** — Trade animals player-to-player (pricing model based on tier, rarity, supply)
- **Tickets** — Premium currency from minigames / special events

### Social
- **Leaderboard** — Top 50 global ranking
- **Trading** — Direct player offers
- **World** — Shared 3D environment, cosmetics, fountain rewards

### Support & Meta
- **Support Chat** — Player tickets + admin replies
- **Settings** — i18n (de/en/ru), theme, notifications
- **Privacy** — GDPR + data handling

---

## Player Journeys

### New Player (0–7 days)

#### Minute 0–2: Signup & First Login
**Goal:** Get into the game in <30s.
- Supabase email auth
- Auto-create profile + starter animal (Chick)
- Show **immediate visual feedback**: coins ticking up in real-time

**UI/UX:**
- Post-login: big "Welcome" card → explain coins/animals in 2 sentences
- Highlight the animal emoji + coin counter
- **Call to action:** "Buy your first Huhn" (yellow button)

#### Minute 2–5: First Purchase & Understanding Passive Income
**Goal:** Feel the power fantasy of passive income.
- Pre-loaded with 300 coins (so first buy is achievable)
- Buy Huhn (250 coins) → see it appear in farm
- Watch coins regenerate (now earning 0.5+2 = 2.5/sec)
- **Explanation card:** "Your animals are working 24/7! Even when you're offline."

#### Minute 5–10: Discover Minigames (Immediate Gratification)
**Goal:** Break the idle loop with active play.
- Show 3–4 minigame cards as "Quick Plays" in GameView
- **Rotate** which minigames appear (to highlight variety)
- Parkour intro: 10s tutorial on touch controls
- Reward: visible coin boost (e.g., +50 coins) for first mini-game play
- **Celebrate:** Toast notification "Great! 🎉 You earned coins!"

#### Day 1–7: Habit Loop (Return Daily)
**Goal:** Build play-every-day behavior.
- ❌ **Missing:** Daily quest system
- ❌ **Missing:** Login bonuses
- ⚠️ **Gap:** No reason to return after first session

### Existing Player (Day 8+)

#### Retention Challenges
- **Idle game fatigue:** Coins accumulate, nothing new to buy
- **Multiplayer isolation:** Market/trading feels empty (few active players)
- **Progression plateau:** Jump from Schwein (6k) to Schaf (30k) is steep
- **Minigame difficulty:** Boss fight / parkour may be hard for casual players

#### Engagement Opportunities
- **Breeding endgame:** Unlock Panda/Tiger/Dragon tier animals
- **Boss fight progression:** Climb the leaderboard
- **Market arbitrage:** Buy low, sell high (requires social play)
- **Limited-time events:** Seasonal animals, special cosmetics
- **Tournaments:** Weekly top-scorer challenges

---

## Roadmap: Next Steps

### Phase 1: Onboarding (Weeks 1–2)

#### 1.1 Tutorial Overlay (Interactive)
**What:** 3-slide modal on first login
- Slide 1: "Coins = idle income. Animals work 24/7."
- Slide 2: "Play minigames for quick coins."
- Slide 3: "Visit the Market to trade with players."

**Where:** `src/components/OnboardingModal.vue`  
**Data:** Store `profile.onboarding_step` (0/1/2/3, +server `complete_onboarding`)  
**Localization:** `src/i18n.js` keys `onboarding.*`

**Files to create:**
- `src/components/OnboardingModal.vue` — 3-slide carousel
- Migration: `supabase/migrations/20261001_onboarding_state.sql`
- Tests: `src/onboarding.test.js` (validate step progression)

#### 1.2 First-Time Bonus (Incentive)
**What:** +500 coins at signup (not 300)  
**Why:** Remove friction on first 2–3 animal purchases  
**Impl:** Trigger in `create_profile()` RPC (check `created_at`, set `first_login_bonus_given`)

### Phase 2: Daily Engagement (Weeks 3–4)

#### 2.1 Daily Quests
**What:** 3 daily quests per day (reset UTC 00:00)
- Quest A: "Earn 100 coins" (easy, passive)
- Quest B: "Play any minigame" (1 session)
- Quest C: "Buy/sell on market" or "Breed 1 animal" (active)

**Rewards:**
- Complete A → +100 coins
- Complete B → +50 coins + 5 tickets
- Complete C → +25 coins + 10 tickets
- **Bonus:** Complete all 3 → +100 coins + mystery cosmetic

**Where:**
- DB: `daily_quests` table (user_id, quest_id, day_key, completed_at, reward_claimed)
- RPC: `submit_daily_quest(p_quest_id)` → claim reward (with idempotency check)
- UI: `QuestCard.vue` in GameView, visual progress bar

**Files to create:**
- Migration: `supabase/migrations/20261005_daily_quests.sql`
- `src/quests.js` (quest definitions, validation)
- `src/components/QuestCard.vue`
- `src/stores/game.js` (extend with quest state/actions)

#### 2.2 Login Streak
**What:** Reward consecutive days of play
- Day 1: +10 coins
- Day 3: +50 coins
- Day 7: +200 coins + 1 rare animal egg
- Day 14: +500 coins + special cosmetic

**Where:** `profile.login_streak_current`, `login_streak_best`, `last_login_at`

**Files:**
- Extend migration from 2.1
- `src/stores/game.js` (update login streak on app resume)

### Phase 3: Achievement Milestones (Weeks 5–6)

#### 3.1 Achievement System
**What:** 25–30 milestone badges
- "First Blood" — Buy first animal (auto-unlock)
- "Zoo Keeper" — Own 5 animals simultaneously
- "Collector" — Buy 1 of each species
- "Rich" — 1M coins earned (lifetime)
- "Breeder" — Create 5 eggs
- "Top 50" — Reach leaderboard rank 50
- "Gamer" — Play 100 minigame sessions
- "Market Master" — 10 successful trades (buyer + seller)
- "Boss Slayer" — Defeat boss 10 times
- etc.

**Where:**
- DB: `achievements` table (id, key, title_de, title_en, title_ru, description, icon_emoji, rarity, unlock_condition_sql)
- RPC: `check_achievements()` (audit query → auto-unlock qualified achievements)
- UI: `AchievementCard.vue` in new `/achievements` route (filter by rarity, sort by unlock date)

**Files to create:**
- Migration: `supabase/migrations/20261008_achievements.sql`
- `src/achievements.js` (50 conditions & metadata)
- `src/components/AchievementCard.vue`
- `src/views/AchievementsView.vue`
- Route in `src/router.js`

#### 3.2 Badge Display (Profile)
**What:** Show top 5 unlocked achievements on profile  
**Where:** `ProfileView.vue` → new "Achievements" section with emoji badges

### Phase 4: Analytics & Funneling (Ongoing)

#### 4.1 Core Metrics
**What:** Track via Supabase analytics / custom telemetry
- **Signup → First Login:** conversion %
- **First Login → First Buy:** hours elapsed, %
- **First Buy → First Minigame:** hours, %
- **Day 1 retention:** % returning on Day 2
- **Day 7 retention:** % with ≥1 session
- **Feature adoption:** % trying market, breeding, each minigame
- **LTV:** avg lifetime coins spent, tier reached, days active

**Where:** Insert into `events` table on each action (via RPC `log_event(event_type, event_data)` or client-side lazy RPC)

**Files to create:**
- Migration: `supabase/migrations/20261010_analytics_events.sql` (table + RLS + insertion RPC)
- `src/analytics.js` (wrapping function to lazy-fire event RPCs)
- Integration points: `src/router.js` (route navigation), `src/stores/game.js` (purchases, game plays), `src/stores/auth.js` (login)

#### 4.2 Funneling Dashboard (Private Admin View)
**What:** View in `/admin` → "Funnels" tab showing conversion step-by-step  
**Where:** Backend SQL view; frontend admin-only chart (via Artifact / Chart.js)

---

## Feature Interaction Map

```
Signup
  └─> Onboarding Tutorial (1.1)
       └─> First Bonus (1.2)
            └─> Daily Quests (2.1) + Login Streak (2.2)
                 └─> Achievements (3.1)
                      └─> Profile Display (3.2)

Minigames
  └─> Quest B trigger (2.1)
       └─> "Gamer" achievement (3.1)
            └─> Analytics funnel (4.1)

Market
  └─> Quest C trigger (2.1)
       └─> "Market Master" achievement (3.1)
            └─> Analytics adoption (4.1)

Breeding
  └─> Quest C alternative (2.1)
       └─> "Breeder" achievement (3.1)
            └─> Tier progression → Dragon unlock
                 └─> "Collector" achievement (3.1)
```

---

## Technical Debt & Optimization

### Must-Fix Before Phase 1
- ❌ **Onboarding is broken** — No tutorial, no first-time guidance
- ❌ **Quest system missing** — No hooks for daily engagement
- ✓ **Auth/profiles** — Solid (Supabase RLS)
- ✓ **Minigames** — Functional (Parkour, Drift, Memory, Blockfall, Wordle, Boss)
- ✓ **Market/Breeding** — Implemented
- ⚠️ **Leaderboard** — Global ranking exists, but no achievement leaderboards (e.g., "most gamer sessions")

### Performance Notes
- Daily quest checks (`check_achievements()`) should use indexed lookups or materialized views to avoid N+1 on profile load.
- Analytics event logging should be **fire-and-forget** (lazy RPC) to avoid blocking gameplay.

### Security Review
- ✓ All coin/ticket mutations via `SECURITY DEFINER` RPC → no client-side spoofing
- ✓ RLS on all user-facing tables
- ✓ Daily quest reward idempotency → check `completed_at` before issuing
- ✓ Achievement unlock audit via SQL condition, no client claim

---

## Success Criteria

| Metric | Baseline | Target (30 days) |
|--------|----------|------------------|
| Day 1 Retention | ? | >50% |
| Day 7 Retention | ? | >30% |
| Avg Session Length | ? | >8 min |
| DAU (Daily Active Users) | ? | +30% |
| Feature Adoption (Shop → Buy) | ~80% | >90% |
| Feature Adoption (Minigame) | ~40% | >70% |
| Feature Adoption (Market) | ~20% | >50% |
| Avg Animals Owned | ~3 | >5 |
| Breeding Adoption | ~10% | >25% |

---

## Implementation Priority

### Sprint 1 (This Week)
1. Onboarding Tutorial (1.1)
2. First-Time Bonus (1.2)
3. Analytics foundation (4.1)

### Sprint 2 (Next Week)
1. Daily Quests (2.1)
2. Login Streak (2.2)

### Sprint 3 (Week 3)
1. Achievement System (3.1)
2. Profile display (3.2)

### Sprint 4+ (Continuous)
1. Funneling dashboard (4.2)
2. Balance tuning based on metrics
3. New seasons/events

---

## Design Assets Needed

- 📱 **Onboarding slide illustrations** — 3 PNG/SVG (coins, minigames, market)
- 🎖️ **Achievement badge sprites** — 25–30 emoji or small PNG set
- 📊 **Dashboard mockup** — Funnel chart design (for funnel view)

---

## Open Questions

1. **Monetization:** Are Tickets currently paidable-for (via IAP)? If yes, should quest rewards include Tickets?
2. **Event Calendar:** Is there a planned seasonal event calendar? Achievements should tie to events.
3. **Social Features:** Friends list (FriendsView) is stubbed. Should we implement that before daily quests (to enable co-op quests)?
4. **Difficulty Curve:** Schaf → Schwein gap is 5x. Should we add intermediate tier animals?
5. **Notifications:** Should daily quest completion trigger push notifications (via Capacitor)?

---

## Files to Create/Modify

### Phase 1
- Create: `src/components/OnboardingModal.vue`
- Create: `src/onboarding.js`
- Create: `src/onboarding.test.js`
- Modify: `src/App.vue` (show modal on first login)
- Modify: `src/stores/auth.js` (track `onboarding_step`)
- Modify: `src/i18n.js` (onboarding strings)
- Create: `supabase/migrations/20261001_onboarding_state.sql`

### Phase 2
- Create: `src/components/QuestCard.vue`
- Create: `src/quests.js`
- Create: `src/quests.test.js`
- Modify: `src/GameView.vue` (quest sidebar)
- Modify: `src/stores/game.js` (quest state/actions)
- Modify: `src/i18n.js` (quest strings)
- Create: `supabase/migrations/20261005_daily_quests.sql`

### Phase 3
- Create: `src/components/AchievementCard.vue`
- Create: `src/achievements.js`
- Create: `src/achievements.test.js`
- Create: `src/views/AchievementsView.vue`
- Modify: `src/ProfileView.vue` (show badges)
- Modify: `src/router.js` (add achievements route)
- Modify: `src/i18n.js` (achievement strings)
- Create: `supabase/migrations/20261008_achievements.sql`

### Phase 4
- Create: `src/analytics.js`
- Modify: all views (integrate analytics telemetry)
- Create: `supabase/migrations/20261010_analytics_events.sql`

---

## Roadmap Summary

```
Week 1  | Onboarding UI + First Bonus
Week 2  | Daily Quests + Login Streak + Analytics
Week 3  | Achievements + Profile Display
Week 4+ | Tuning, Events, Monetization
```

By Week 4, Zoo Empire will have:
- ✨ Clear onboarding path
- 🎯 Daily engagement loop
- 🏆 Goal-oriented progression
- 📊 Data-driven balance tuning

---

## Appendix: Competitive Analysis

### Comparable Idle Games
- **AdVenture Capitalist:** Prestige system, milestones, offline earnings
- **Cookie Clicker:** Achievements (150+), upgrades, meta-progression
- **Merge Dragons:** Daily tasks, chests, event-driven engagement
- **Idle Heroes:** Daily quests, battle pass, seasonal events

### Zoo Empire Differentiation
- ✨ Minigames (unique active component)
- 🌍 3D World (cosmetics, social presence)
- 🐾 Breeding genetics (deeper strategy)
- 📈 Transparent market economics

**Retention Focus:** Minigames + daily loop will keep players coming back more than idle-only competitors.

---

## See Also

- `AGENTS.md` — Technical stack & conventions
- `docs/superpowers/specs/2026-09-24-tier-boerse-design.md` — Market mechanics
- `docs/superpowers/specs/2026-08-03-zoo-welt-design.md` — World/cosmetics
