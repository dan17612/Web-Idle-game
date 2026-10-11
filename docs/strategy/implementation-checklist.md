# Zoo Empire: Implementation Checklist

Quick reference for phased rollout of newcomer retention & endgame features.

---

## Phase 1: Newcomer Onboarding (Weeks 1–2)

### Tutorial System
- [ ] Create `src/components/OnboardingFlow.vue` (3-step wizard)
  - [ ] Step 1: Tap-to-earn mechanic (highlight farm)
  - [ ] Step 2: Visit shop (pre-select cheapest animal)
  - [ ] Step 3: Play first minigame (auto-launch Drift or Memory)
- [ ] Add `isFirstLogin` flag to `auth.js` store
- [ ] Trigger tutorial on GameView mount if `isFirstLogin === true`
- [ ] Add skip button (analytics: track skips)

### Goal System
- [ ] Add to `src/stores/game.js`:
  ```js
  completedGoals: [],  // array of goal IDs
  activeGoal: null,    // current focus goal
  ```
- [ ] Create `src/goals.js`:
  ```js
  export const GOALS = {
    buy_5_animals: { id: 'buy_5_animals', name: '...', target: 5, reward: 500 },
    play_3_minigames: { ... },
    send_coins: { ... },
    reach_10k_coins: { ... },
  }
  ```
- [ ] In GameView, add progress banner at top
- [ ] Hook goal completion events (animal purchase, minigame finish, coin send)
- [ ] Show celebration modal on goal complete + reward animation

### Database Changes
- [ ] Supabase migration: Add `user_goals` table
  ```sql
  CREATE TABLE user_goals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    goal_id TEXT,
    progress INT,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, goal_id)
  );
  ```
- [ ] RPC: `update_goal(goal_id, increment)` — increment progress & fire completion event

### Testing
- [ ] Unit tests: goal completion logic in `src/goals.test.js`
- [ ] E2E: Simulate new player flow (login → tutorial → goal 1 complete)
- [ ] UX test: Verify skip button works, tutorial closes cleanly

---

## Phase 2: Cosmetics & Rarity (Weeks 3–4)

### Animal Cosmetics
- [ ] Update `src/animals.js`:
  ```js
  animals.chick.cosmetics = [
    { id: 'default', name: 'Fluffy', emoji: '🐤' },
    { id: 'golden', name: 'Golden', emoji: '✨🐤' },
    { id: 'winter', name: 'Icy', emoji: '❄️🐤' },
  ]
  ```
- [ ] Add `currentCosmetic` to animal record in DB
- [ ] Update `src/views/InventoryView.vue`:
  - [ ] Show cosmetic selector (radio buttons or carousel)
  - [ ] Display currently equipped cosmetic
  - [ ] Gray out locked cosmetics

### Rarity System
- [ ] Add `rarity: 'common' | 'shiny'` to animal spawning logic
- [ ] Shiny animals:
  - [ ] Different emoji or color modifier
  - [ ] +10% coin earning
  - [ ] Badge in inventory ("✨ Shiny")
  - [ ] Non-tradeable (check in trade RPC)
- [ ] Track in DB: `animal_id` → `rarity` field

### Cosmetic Unlock Logic
- [ ] Create `src/cosmetics.js`:
  ```js
  export const COSMETIC_UNLOCKS = {
    golden_chick: { type: 'achievement', target: 'coins_1m' },
    winter_chick: { type: 'seasonal', until: '2026-12-25' },
    // ...
  }
  ```
- [ ] Check unlock conditions on inventory load
- [ ] Show "Unlock via: [achievement/seasonal/premium]" UI

### Database Changes
- [ ] Alter `animals` table:
  ```sql
  ALTER TABLE animals ADD COLUMN rarity TEXT DEFAULT 'common';
  ALTER TABLE animals ADD COLUMN current_cosmetic TEXT;
  ```
- [ ] Update animal spawn RPC: include rarity roll
- [ ] Update trade RPC: reject shiny animals

### Testing
- [ ] Unit: Rarity generation probability (1% shiny)
- [ ] UI: Cosmetic selector in inventory
- [ ] Trade: Verify shiny animals blocked from trades

---

## Phase 3: Battle Pass & Achievements (Weeks 5–8)

### Battle Pass Infrastructure
- [ ] Create `src/stores/battlePass.js`:
  ```js
  season: 1,
  level: 0,
  xp: 0,
  challenges: [], // weekly challenges
  unlocks: [],    // claimed rewards
  ```
- [ ] Create `src/battlePass.js`:
  ```js
  export const SEASONS = {
    1: {
      name: 'Season 1: Wild Animals',
      rewards: [
        { level: 1, reward: { coins: 500 } },
        { level: 5, reward: { cosmetic: 'gold_tiger' } },
        // ...
      ],
    },
  }
  export const CHALLENGES = {
    season_1: [
      { id: 'earn_100k', text: '...', target: 100000, reward_xp: 10 },
      // ...
    ],
  }
  ```

### Achievement System
- [ ] Create `src/achievements.js`:
  ```js
  export const ACHIEVEMENTS = {
    parkour_master: {
      id: 'parkour_master',
      name: 'Parkour Master',
      description: 'Complete parkour 100 times',
      target: 100,
      reward: { cosmetic: 'athletic_dragon', gems: 50 },
      category: 'minigames',
    },
    // ...
  }
  ```
- [ ] In `game.js`: track `achievementProgress[id]`
- [ ] Create `src/views/AchievementsView.vue`:
  - [ ] Grid of achievements
  - [ ] Progress bar per achievement
  - [ ] Locked/unlocked state
  - [ ] Reward preview

### UI Components
- [ ] New view: `src/views/BattlePassView.vue`
  - [ ] Free vs premium tab
  - [ ] Horizontal scroll through levels
  - [ ] Claim reward button (animated)
  - [ ] Seasonal countdown timer
- [ ] Challenge tracker (GameView footer or sidebar)
- [ ] Progress notifications (toast: "Challenge complete!")

### Database Changes
- [ ] New tables:
  ```sql
  CREATE TABLE user_battle_pass (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    season INT,
    level INT,
    xp INT,
    purchased_premium BOOLEAN,
    created_at TIMESTAMPTZ,
    UNIQUE(user_id, season)
  );

  CREATE TABLE user_achievements (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    achievement_id TEXT,
    progress INT,
    unlocked_at TIMESTAMPTZ,
    UNIQUE(user_id, achievement_id)
  );

  CREATE TABLE user_challenges (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    season INT,
    challenge_id TEXT,
    progress INT,
    claimed BOOLEAN,
    claimed_at TIMESTAMPTZ,
    UNIQUE(user_id, season, challenge_id)
  );
  ```
- [ ] RPCs:
  - [ ] `claim_challenge_reward(season, challenge_id)` → update progress + xp
  - [ ] `claim_battle_pass_level(season, level)` → check xp, give reward
  - [ ] `purchase_battle_pass(season)` → mark premium = true

### Testing
- [ ] Unit: XP calculation, level progression
- [ ] Integration: Challenge completion → XP award → level up
- [ ] UI: Battle pass view rendering, claim buttons

---

## Phase 4: Gem Shop & Premium (Weeks 9–10)

### Gem Currency System
- [ ] Add to auth schema:
  ```sql
  ALTER TABLE profiles ADD COLUMN gems INT DEFAULT 0;
  ```
- [ ] Create `src/gemShop.js`:
  ```js
  export const GEM_SHOP = {
    rotations: [
      {
        week: 1,
        cosmetics: ['golden_dragon', 'winter_tiger', 'crown_decoration'],
        endTime: new Date('2026-09-21'),
      },
    ],
    prices: {
      golden_dragon: { gems: 350, usd: 4.99 },
      // ...
    },
  }
  ```

### Shop UI
- [ ] Refactor `src/views/ShopView.vue` → split into:
  - [ ] Animal shop (existing)
  - [ ] Cosmetic shop (new tab)
- [ ] Cosmetic shop grid:
  - [ ] Limited stock indicator + countdown
  - [ ] "Buy with gems" / "Unlock via battle pass" buttons
  - [ ] Gem balance display (top right)
  - [ ] Preview on hover

### Payment Integration
- [ ] Set up Stripe or Apple Pay via Supabase
- [ ] Create `src/payments.js`:
  ```js
  export async function purchaseGems(amount_usd) {
    const session = await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ amount_cents: amount_usd * 100 }),
    }).then(r => r.json());
    // Redirect to payment
    return session.url;
  }
  ```
- [ ] Supabase Edge Function: `/api/checkout` → create Stripe session
- [ ] Webhook handler: On successful payment → update gems balance

### Free Gem Earners
- [ ] Daily login streak:
  ```js
  // In game.js
  if (day 7 of streak) addGems(10);
  if (day 14 of streak) addGems(15);
  if (day 30 of streak) addGems(25);
  ```
- [ ] Battle pass free tier → 50 gems reward
- [ ] Achievement rewards (encoded in achievements.js)
- [ ] Referral bonus: +100 gems when referred friend hits 24h playtime

### Testing
- [ ] Unit: Gem balance updates
- [ ] Integration: Payment flow (test mode)
- [ ] UI: Gem shop rendering, purchase flow

---

## Cross-Phase Tasks

### Analytics & Monitoring
- [ ] Set up event tracking (Vercel Analytics or custom):
  - [ ] tutorial_started, tutorial_skipped, tutorial_completed
  - [ ] goal_completed, achievement_unlocked, battle_pass_level_up
  - [ ] cosmetic_purchased, gem_spent
- [ ] Dashboard: DAU, retention curves, goal completion rate
- [ ] Alerts: Payment failures, API errors

### Documentation
- [ ] Update `AGENTS.md` with new features
- [ ] Create cosmetic design spec (`docs/superpowers/specs/`)
- [ ] Create battle pass balance doc
- [ ] Add UI patterns to `styles.css` (if needed)

### Community & Comms
- [ ] Announce phases in-game (news banner)
- [ ] Social media teasers (Twitter, Discord)
- [ ] In-game tutorial video (optional, for Parkour/Drift)

---

## Success Criteria (Post-Launch)

| Metric | Target | Measure |
|--------|--------|---------|
| Day 1 → Day 7 retention | 40% | (day7 players / day1 players) |
| Tutorial completion | 90% | (skip <10%) |
| Goal 1 completion | 85% | (buy 5 animals reached) |
| Veteran DAU (30+ days) | +25% vs baseline | Compare Nov 2026 vs Sep 2026 |
| Cosmetic adoption | 60% | (players with ≥1 cosmetic) |
| Battle pass completion | 30% | (reach level 50) |
| Gem shop ARPU | $1.50/month | (paying players only) |

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Cosmetics feel p2w | Low | No stat bonuses, cosmetics = visual only |
| Battle pass too grindy | Medium | Adjust challenge targets based on beta feedback |
| Low gem shop conversion | Medium | A/B test pricing, rotate cosmetics frequently |
| Server load (new RPCs) | Low | Index user_goals, user_challenges tables |
| Privacy concerns (gems) | Low | No payment data stored client-side, Stripe PCI-DSS |

---

## File Summary

### New Files
- `src/components/OnboardingFlow.vue` (tutorial)
- `src/goals.js` (first-week goals)
- `src/cosmetics.js` (cosmetic unlocks)
- `src/battlePass.js` (seasons + challenges)
- `src/achievements.js` (achievement catalog)
- `src/gemShop.js` (shop rotation + pricing)
- `src/views/BattlePassView.vue`
- `src/views/AchievementsView.vue`

### Modified Files
- `src/animals.js` (add cosmetics, rarity)
- `src/views/GameView.vue` (add tutorial trigger, goal banner)
- `src/views/InventoryView.vue` (cosmetic selector)
- `src/views/ShopView.vue` (split into tabs)
- `src/stores/game.js` (goals, cosmetics, battle pass state)
- `src/stores/auth.js` (gems balance)
- `supabase/migrations/*.sql` (new tables, RPCs)

### Database
- `user_goals` table
- `user_battle_pass` table
- `user_achievements` table
- `user_challenges` table
- New RPCs: `update_goal`, `claim_challenge_reward`, `claim_battle_pass_level`, `buy_cosmetic`, `purchase_battle_pass`

---

**Last Updated:** 2026-09-14  
**Status:** Ready for Sprint Planning
