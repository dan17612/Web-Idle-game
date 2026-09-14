# Zoo Empire: Newcomer Retention & Endgame Strategy (2026-09-14)

## Overview

Zoo Empire has a solid foundation with multiple minigames, trading systems, and social features. To sustain growth and keep both newcomers and veterans engaged, we need to focus on **three strategic pillars**:

1. **Onboarding Flow** — Make the first 30 minutes crystal clear and rewarding
2. **Progression Loops** — Create visible, achievable milestones from day 1 to day 1000
3. **Endgame Depth** — Give max-level players reasons to keep playing (collection goals, cosmetics, seasonal challenges)

---

## Problem Analysis

### Current State
- ✅ Rich minigame ecosystem (Drift, Parkour, Memory, Boss Path, Endless Boss)
- ✅ Trading & social features (leaderboards, send coins, marketplace)
- ✅ Three-tier gameplay loop (idle earnings → shop → minigames)
- ❌ **New players don't see a clear path** — what should they do first?
- ❌ **Veterans hit a wall** — once animals are maxed, why keep playing?
- ❌ **No seasonal/cosmetic depth** — appearance doesn't matter yet
- ❌ **No collection/achievement system** — no reason to grind for all animals

### What Players Need to Stay

**Day 1–7 (Newcomers):**
- One clear goal ("Buy this animal next")
- Frequent small wins ("You earned 50 coins!")
- Minimal friction (no menu hell)
- A "wow" moment (first minigame, first trade, first friend interaction)

**Day 30+ (Veterans):**
- A cosmetic to work toward (pet skins, farm decorations, player badges)
- Seasonal challenges (limited-time goals, weekly leaderboards)
- Collection depth (rare animals, special editions, variants)
- Community showcase (show off rare items, achievements)

---

## Proposed Q4 2026 Roadmap

### Phase 1: Newcomer Onboarding (Weeks 1–2)

**Problem:** New players land in GameView with 10 different buttons and no context.

**Solution: Interactive Tutorial & Goal-Setting**

1. **First-Time Flow:**
   - Auto-trigger a 3-step tutorial on first login
   - Step 1: "Tap your farm to earn coins" (highlight tap-to-click)
   - Step 2: "Visit the Shop and buy your first animal" (preselect cheapest animal)
   - Step 3: "Play a minigame to earn bonus coins" (auto-open Drift or Memory)

2. **Progressive Goals (First Week):**
   - Goal 1: Buy 5 animals (reward: 500 coins)
   - Goal 2: Play 3 minigames (reward: special animal egg)
   - Goal 3: Send coins to a friend (reward: +10% coin earning for 24h)
   - Goal 4: Reach 10,000 total coins (reward: unique "Pioneer" badge)

3. **UI Change:**
   - Add "Next Goal" banner at top of GameView
   - Show progress bar ("3/5 animals purchased")
   - Celebration pop-up when goal completes

**File Changes:**
- `src/views/GameView.vue` — add tutorial trigger + goal display
- `src/stores/game.js` — track `firstLogin`, `tutorialStep`, `completedGoals`
- `src/components/TutorialBubble.vue` — upgrade with animated pointer + skip button

---

### Phase 2: Progression & Collection Depth (Weeks 3–4)

**Problem:** Once you own all animals, there's no reason to grind for more coins.

**Solution: Cosmetics, Variants & Rarity Tiers**

1. **Animal Cosmetics (Skins):**
   - Each animal gets 2–3 unique skins (e.g., Chick = normal, golden, winter)
   - Skins earned via:
     - Achievements (e.g., "Earn 1M coins" unlocks Dragon skin pack)
     - Seasonal events (e.g., winter chick available Dec 1–25 only)
     - Battle pass rewards (see Phase 3)
     - Cosmetic shop (2–5 premium currencies per skin)

2. **Rarity Variants:**
   - Each animal has a 1–5% chance to be "Shiny" (rare variant)
   - Shiny variants:
     - Look different (gold shimmer, special color)
     - Earn +10% coins/sec
     - Can't be traded (unique to player)
     - Display a special badge in inventory

3. **Milestone Collections:**
   - "Collect all birds" (Chick, Penguin, Phoenix) → unlock bird-themed farm decoration
   - "Collect 50 animals" → unlock special profile frame
   - "Collect all shiny variants" (endgame grind) → title "Collector"

**File Changes:**
- `src/animals.js` — add `cosmetics: []`, `rarityChance: 0.01`
- `src/views/InventoryView.vue` — show skin selector, rarity badge
- New `src/cosmetics.js` — cosmetic catalog + unlock logic
- `src/stores/game.js` — track `collectedCosmetics`, `shinyAnimals`

---

### Phase 3: Endgame Systems (Weeks 5–8)

**Problem:** Veterans have no competitive or achievement-based reason to log in daily.

**Solution: Seasonal Battle Pass & Achievement System**

1. **Seasonal Battle Pass (Monthly):**
   - Free tier: 5 cosmetics + 5,000 coins
   - Premium tier (+$2.99): 15 cosmetics + special pet skin + title
   - Challenges (weekly reset):
     - "Earn 100k coins" (task-based)
     - "Win 10 boss fights" (minigame-based)
     - "Send coins to 3 friends" (social-based)
   - Players earn 10 pass XP per challenge, unlock rewards every level

2. **Achievements & Titles:**
   - Gameplay achievements:
     - "Parkour Master" (complete parkour 100 times)
     - "Drifting Legend" (reach 100k in Drift minigame)
     - "Collector's Pride" (own all animals simultaneously)
   - Social achievements:
     - "Friend Maker" (befriend 5 players)
     - "Generous" (send 1M coins total)
   - Seasonal achievements (limited-time, high value):
     - "Winter Guardian" (earn 500k coins in December)
     - "Spring Rush" (complete 20 minigames in March)

3. **Leaderboard Variants:**
   - Current: Top 50 by total coins
   - New: Weekly minigame leaderboards (Drift, Parkour, Memory, Boss)
   - New: Cosmetic count leaderboard (flex your skin collection)

**File Changes:**
- New `src/views/BattlePassView.vue`
- New `src/battlePass.js` — pass structure + unlock logic
- New `src/achievements.js` — achievement catalog + tracker
- `src/stores/game.js` — track `battlePassLevel`, `achievementProgress`
- `src/views/LeaderboardView.vue` — add tab switcher for different leaderboards

---

### Phase 4: Cosmetic & Premium Shop (Weeks 9–10)

**Problem:** No monetization beyond battle pass; cosmetics are the main hook but no shop.

**Solution: Cosmetic Currency (Gems) & Limited Shop**

1. **Gem Shop:**
   - Offer cosmetics for $0.99–$9.99 in USD (via Stripe/Apple Pay via Supabase)
   - Limited stock: 5 cosmetics rotate weekly (FOMO mechanic)
   - Cosmetics tied to season/theme (e.g., "Autumn collection," "Festival skins")
   - Battle pass can be purchased with gems too ($9.99/month)

2. **Free Gem Earners:**
   - Daily login streak (day 7, 14, 30 reward gems)
   - Battle pass free tier gives 50 gems
   - Seasonal achievements give 10–50 gems each
   - Share referral bonus: +100 gems when friend plays 24h

3. **Shop UI:**
   - New tab in GameView: "Cosmetics" (next to Farm/Shop/Minigames)
   - Grid of cosmetics with "Buy (gems)" or "Unlock via challenge"
   - "You own: 5 cosmetics" counter
   - Countdown timer on limited items

**File Changes:**
- New `src/views/ShopView.vue` (refactor: shop → farm shop, cosmetics → new tab)
- New `src/gemShop.js` — rotation logic, pricing
- `src/stores/game.js` — track `gems`, `gemBalance`
- Supabase RPC: `buy_cosmetic(cosmetic_id, price_gems)`

---

## Implementation Priority

| Phase | Focus | Effort | Impact | Timeline |
|-------|-------|--------|--------|----------|
| 1 | Tutorial + first-week goals | 1 sprint | 🟢 High (retention) | Week 1–2 |
| 2 | Cosmetics + rarity | 2 sprints | 🟢 High (engagement) | Week 3–4 |
| 3 | Battle pass + achievements | 2 sprints | 🟡 Medium (depth) | Week 5–8 |
| 4 | Gem shop + premium cosmetics | 1 sprint | 🟠 Lower (monetization) | Week 9–10 |

---

## Key Metrics to Track

After launch, monitor:

1. **Newcomer Retention:**
   - Day 1 → Day 7 retention rate (target: 40%)
   - Day 7 → Day 30 retention rate (target: 25%)
   - Tutorial completion rate (target: 90%)

2. **Veteran Engagement:**
   - Daily active users (DAU) among players with 30+ days playtime
   - Average daily session length (target: 3–5 min)
   - Battle pass completion rate (target: 30–40%)

3. **Cosmetic Adoption:**
   - % of players with cosmetics unlocked (target: 60% by day 30)
   - Skin usage rate (% of players using non-default skins)
   - Gem shop revenue per paying user (ARPU target: $1.50/month)

---

## Design Philosophy

**Keep It Cute, Not Complex:**
- All new features use existing UI patterns (buttons, grids, modals)
- No new navigation menus (reuse bottom nav)
- Cosmetics are visual fluff, not pay-to-win
- Free players see everything, just earn slower

**Progression Should Feel Natural:**
- First week: "I'm building a zoo"
- Second week: "I'm decorating my farm"
- Month 1+: "I'm competing for rare cosmetics"

---

## Next Steps

1. **Design Review:** Get team consensus on cosmetics direction + battle pass pricing
2. **Spec Writing:** Detailed specs for each phase (Phase 1 first)
3. **Asset Prep:** Cosmetic skins, achievement badges, seasonal themes
4. **Dev Sprint 1:** Tutorial + goal system launch
5. **Feedback Loop:** Early testers (Discord, closed beta) validate before phase 2

---

## Questions for Stakeholders

- **Cosmetics Budget:** Who designs skins? Internal or outsource?
- **Pricing:** Is $9.99/month for battle pass correct for mobile/region?
- **Seasons:** Monthly or quarterly battle pass cycles?
- **Analytics:** Do we have user behavior data (DAU, session length) today?
- **Monetization:** Is gems-only (no ads) acceptable? Or hybrid?

---

**Created:** 2026-09-14  
**Status:** Proposal – Ready for Design Review  
**Owner:** Zoo Empire Product Team
