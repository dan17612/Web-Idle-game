# Zoo Empire — Player Experience Roadmap

## Executive Summary

Zoo Empire has a strong foundation with rich mechanics (minigames, trading, social features, economy). To make the game "cool" for **both new players** (onboarding & discovery) and **existing players** (long-term engagement), we propose:

1. **Clarity & Progression** — Make the core loop intuitive; guide new players without gate-keeping
2. **Mastery & Cosmetics** — High progression ceiling; cosmetics tied to achievement & self-expression
3. **Community & Competition** — Expand social features; make leaderboards & seasonal content core to retention
4. **Content Cadence** — Regular feature drops (monthly) with both minigames and economy balancing

---

## 1. New Player Experience (First 30 Minutes)

### Challenge: Why Players Leave

New idle-game players often experience:
- **Too many systems at once** → confusion about what to do first
- **Unclear progression** → "Is this leading somewhere?"
- **Weak early rewards** → tapping feels pointless before first animal
- **Cosmetics behind paywalls** → no personalization early on

### Solution: Guided Discovery Path

#### 1.1 Login → Welcome Sequence (Optional, Dismissible)

**Goal:** In 2 minutes, players understand "tapping → coins → animals → minigames → income"

```
Screen 1: "Welcome to Zoo Empire" 
  ↓ (Auto-advance after 3 sec or tap)
Screen 2: "Tap the lion for coins"
  → Show hero tapping with highlight glow
  ↓
Screen 3: "Buy your first animal in the Shop"
  → Flash the Shop button
  → Pre-select a cheap tier-0 animal (Bunny, 50 coins)
  ↓
Screen 4: "Equip it → Tap for more coins"
  → Highlight "Team" edit button
  ↓
Screen 5: "Unlock minigames to earn tickets (premium currency)"
  → Show Parkour/Drift/Memory cards with star icons
  ↓
[Dismissible. Checkmark = never show again.]
```

**Implementation:**
- Add `onboarding.tutorial_seen` flag in profiles table (default false)
- In GameView, show TutorialBubble sequence before rendering main content
- Add corresponding I18N keys in i18n.js

#### 1.2 Early-Game Rewards (First 2 Hours of Play)

**Starter Gift (Day 1 Login):**
- +10 bonus taps (on top of daily taps)
- +1 free low-tier animal (Bunny)
- +3 free tickets

**Unlock Progression Badges (Feed engagement loop):**

| Milestone | Reward | Trigger |
|-----------|--------|---------|
| First 100 coins | +10 bonus taps | Taps → 100 coins |
| First animal | +1 ticket | Buy any animal |
| First upgrade | +5 coins | Upgrade tap multiplier |
| First minigame | +1 ticket | Complete any minigame level |
| 5 animals | Cosmetic unlock (Starter Outfit bundle) | Collect 5 species |

These badges are **cosmetic acknowledgments**, not hard gates. They appear in Profile → Achievements.

---

## 2. Retention Loops (Existing Players)

### Challenge: Engagement After 100+ Hours

Idle games suffer when:
- **Daily login bonus becomes rote** → no excitement
- **Progression treadmill feels endless** → "Why grind?"
- **Solo gameplay** → no social hooks
- **No seasonal markers** → time feels flat

### Solution: Seasonal + Weekly + Daily Cadence

#### 2.1 Seasonal Pass (3-Month Cycles)

**Concept:** Cosmetic-heavy progression track (free + premium tiers).

**Season Structure:**
- **Duration:** 12 weeks (4 weeks × 3 themes)
- **Themes:** e.g., Season 1 "Summer Safari" (Aug–Oct 2026)
  - Animal skins (Lion wears sunglasses, Penguin sports cap)
  - World cosmetics (beach umbrellas, ice cream stands in world)
  - Farm skins (tropical garden, snow-covered)
  - Chat frames & nameplates for multiplayer

**Free Track (No $ required):**
- 20 cosmetics spread across 12 weeks
- +500 coins per season completion
- Tied to **gameplay** (minigame completions, trading volume)

**Premium Track (Optional):**
- +25 exclusive cosmetics
- +1000 tickets per season
- Early unlocks (cosmetics available 2 weeks ahead)
- Cost: ~500 coins equivalent or 1 $ monthly

**Progression Drivers:**
- Seasonal Challenges (see 2.2)
- World fountain bonus (+2× weekly)
- Trading volume bonuses

#### 2.2 Weekly Challenges (Refresh Every Monday UTC)

**Goal:** Give direction without requiring every feature.

**Example Set (August 2026 Week 1):**

| Challenge | Target | Reward |
|-----------|--------|--------|
| 🎮 Complete 3 Parkour levels | Minigame plays | +100 coins, +1 challenge token |
| 🐷 Collect 2 new animals | Economy | +200 coins, +1 token |
| 🌍 Visit World 5 times | Social | +50 coins, +1 token |
| 💚 Trade with 1 friend | Social | +100 coins, +1 token |
| ⭐ Earn 3 Drift stars | Mastery | +150 coins, +2 tokens |

**Challenge Tokens:**
- 5 tokens/week = 1 free cosmetic (or 50 coins) or +1 Seasonal Pass XP
- Encourages 5/5 challenge completion without mandatory "do everything"

**Rotation:** 3 fixed (popular features) + 2 rotating (new content discovery)

#### 2.3 Daily Streaks (Mini-Engagement Hooks)

**Current:** Daily login bonus (flat reward)
**Improved:** Streak-based progression

```
Day 1:    +50 coins
Day 3:    +150 coins + 🎁 emoji reaction
Day 7:    +500 coins + 1 ticket (Week complete!)
Day 14:   +1000 coins + 2 tickets (Double week!)
Day 30:   +5000 coins + 5 tickets + Exclusive badge (Month Veteran)
Day 60:   Season-exclusive cosmetic unlock
Day 100:  Legendary title "Zoo Master" + 10 tickets
```

**Streak Pause (Forgiveness):**
- 2× per month, skip a day without losing streak
- Breaks on 3rd consecutive miss
- Prevents "I'm out of town → uninstall" friction

---

## 3. Cosmetics & Identity (For All Players)

### Challenge: Cosmetics Feel Disconnected

Current system has good **breadth** (outfits, farm skins, cars) but lacks **narrative**.

### Solution: Cosmetic Progression Tiers

#### 3.1 Achievement-Tied Cosmetics (No $)

**Example: "Ranger Outfit"**
```
Unlock Path:
  1. Complete Parkour (any star) → Ranger Hat
  2. Complete Parkour level 6 (3 stars) → Ranger Vest
  3. Complete all Parkour levels (3 stars each) → Full Ranger Outfit

Cost: Free (gameplay only)
Display: "Earned" label in World shop
```

This gives cosmetics **meaning** — players see outfits and think "they beat Parkour!"

**Another Example: "Treasure Hunter" (Cross-Feature)**
```
  1. Trade 10 times → Treasure Map accessory
  2. Reach 1M coins → Gold Loot cosmetic
  3. Unlock 5 rare animals → Expedition Hat
  4. Beat Boss-Fight Path Mode → Full Treasure Hunter Outfit
```

#### 3.2 Cosmetics Rarity Tiers

Introduce visual rarity indicators:

| Tier | Example | Display | Availability |
|------|---------|---------|---|
| Common | Starter outfit | Gray frame | Everyone |
| Uncommon | Farmer outfit | Blue frame | 50k coins |
| Rare | Ranger outfit | Purple frame | Earned (Parkour) |
| Epic | Pirate outfit | Orange frame | Seasonal (limited) |
| Legendary | Zodiac skins (12 animals) | Gold frame | Seasonal last week only |

**Display in World:** Nameplate shows rarity color. Encourages cosmetic showcase.

---

## 4. Social & Competitive Expansion

### Challenge: Social Features Exist but Aren't "Cool"

Trading & friends exist, but there's no **spectacle** or **event**.

### Solution: Social Milestones & Leaderboard Prestige

#### 4.1 Leaderboard Modes (Rotate Weekly)

**Current:** Single "Total Coins" rank

**New Modes (Rotate Weekly):**

| Mode | Metric | Reset | Duration | Reward |
|------|--------|-------|----------|--------|
| Coins Tycoon | Total coins | Never | Year | +500 coins top 10 |
| Weekly Grinder | Coins earned this week | Weekly | 7 days | +100 coins top 50 |
| Minigame Master | Minigame stars earned | Monthly | 30 days | Cosmetic top 10 |
| Trading Tycoon | Items traded this season | Seasonal | 12 weeks | +1000 coins top 20 |
| Fountain Finder | Fountain claims | Daily | 24 hrs | +50 coins top 100 |

**Display:** LeaderboardView shows 3 modes at once, tabs for others. Top 10 appear in World (glowing nameplate).

#### 4.2 Friend Leaderboards

**Goal:** Small-scale competition among friend groups.

**Feature:**
- "Friend Standings" tab in LeaderboardView
- Shows your rank among your friends (for each mode)
- "You're #1 among friends! 🏆" badge when winning

**Integration with Trading:**
- Complete trade with friend → "+50 coins to trading score"
- Encourages trading as social activity, not just economy

#### 4.3 Guild-like "Teams" (Future Expansion)

Not for immediate release, but design space:
- Small groups (10–50 players) join a "Zoo Team"
- Weekly Team Challenge (combine coins/minigame stars → team pool)
- Team Hall of Fame in World

---

## 5. Minigame & Economy Balancing

### Challenge: New Minigames Are Content; Old Ones Are Forgotten

Once players 3-star Parkour, there's no reason to revisit.

### Solution: Replayability Incentives

#### 5.1 Infinite Modes (Post-Campaign)

**Parkour Example:**
```
Modes:
  Campaign: 12 levels (current) → 1st clear: 3× reward
  Endless: Infinite procedural levels
    • Level 1–20: 1000 coins each
    • Level 21–50: 2000 coins each
    • Level 51–100: 5000 coins each
    • Level 101+: 10000 coins each
    • Personal best = leaderboard entry
  Daily Challenge: 1 random level, doubled rewards
  Weekly Brawl: Head-to-head vs random player's ghost (async)
```

**Drift Example:**
- Reverse tracks (new geometry from existing)
- Weather modifiers (rain = reduced traction)
- Custom seed (reproducible random tracks for sharing)

#### 5.2 Dynamic Difficulty

**Current:** Each minigame has fixed 12 levels.

**Improvement:** Unlockable hard modes.

```
Parkour Hard Mode unlock: Beat all 12 campaign levels with 3 stars each
  → 12 new "Hard" levels (faster enemies, narrower platforms)
  → 2× reward on hard levels
  → Separate "Hard Mode" leaderboard

Memory Hard Mode unlock: Reach 10 consecutive wins
  → Larger grid (6×6 instead of 4×4)
  → Faster flip timer
```

This gives high-engagement players **goals beyond the base content**.

---

## 6. Content Calendar (Next 6 Months)

**Goal:** One meaningful feature per month; Seasonal pass as anchor.

### September 2026: Seasonal Pass + Weekly Challenges

**Deliverables:**
- Seasonal pass system (UI, progression, cosmetics)
- Weekly challenge refresh (4-week content batch)
- Cosmetics rarity tiers & display
- Streak-based daily login

**Focus:** Clarity & routine for all players.

---

### October 2026: Minigame Expansion (Hard Modes)

**Deliverables:**
- Parkour Hard Mode (12 levels, new geometry)
- Drift Reverse Tracks + Weather modes
- Replayability incentives (daily challenges, infinite modes)
- Leaderboard mode rotation (Minigame Master debuts)

**Focus:** Mastery for engaged players.

---

### November 2026: Social Expansion (Friend Standings)

**Deliverables:**
- Friend Leaderboards (cross-mode)
- Trading Tycoon leaderboard mode
- World player badges (rarity cosmetics visible)
- Trade reward boost (friends get +25% coins from trading)

**Focus:** Community as engagement lever.

---

### December 2026: Seasonal Finale + Holiday Event

**Deliverables:**
- Season 1 finale (last cosmetics available)
- Holiday-themed cosmetics bundle
- Double fountain rewards (Dec 24–Jan 1)
- Year-end leaderboard freeze & annual rankings ("Top 100 2026")

**Focus:** Event-driven engagement & momentum into Season 2.

---

### January 2027: Boss-Fight Expansion (New Boss Mode)

**Deliverables:**
- Guild system (early version, 5-player teams)
- Team Boss-Fight (multiplayer raid-style)
- Team Hall of Fame in World
- Season 2 begins (Winter theme)

---

### February 2027: Memory Multiplayer Rebalance

**Deliverables:**
- Memory Online improvements (faster matchmaking, rating visible)
- Daily 1v1 tournament (winner-of-5 bracket, cosmetic reward)
- Esports-style leaderboard (ranking ladder visible)

**Focus:** Competitive depth for engaged community.

---

## 7. Success Metrics

### New Player (DAY 0–7)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Tutorial Completion | 80%+ | Clarity of onboarding |
| 1st Animal Purchase | 60%+ of Day 1 players | Core loop engagement |
| D1 Retention | 40%+ | Return next day |
| D7 Retention | 25%+ | Weekly engagement |

### Existing Player (WEEK 1+)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Weekly Challenge Completion | 70%+ of active players | Engagement hooks working |
| Minigame Replay (Hard Mode) | 40%+ of campaign players | Replayability |
| Leaderboard Check | 50%+ weekly | Competition mattering |
| Friend Interaction | 30% of players | Social gravity |
| Seasonal Pass Progress | 90%+ of committed players | Progression satisfaction |

### Retention (30-Day Window)

| Metric | Target | Current Estimate | Path |
|--------|--------|---|---|
| D30 Retention | 15%+ | ~10% (guess) | Streaks + weekly challenges |
| Session Length | 15+ min/day avg | ? | Minigame Hard Modes, leaderboards |
| Feature Discovery | 80% try 4+ features | ? | Challenges force discovery |

---

## 8. Risk & Mitigation

### Risk: "Cosmetics for achievements" Feels Too Grindy

**Mitigation:**
- Keep base cosmetics cheap (coins only, 25k–500k)
- Achievement cosmetics are **additive**, not replacing shops
- 50% of cosmetics remain coin-purchasable always
- Early cosmetics (first 2 weeks) easier to earn

### Risk: Leaderboard Modes Dilute Pool

**Mitigation:**
- Show all modes simultaneously (LeaderboardView tabs)
- Weekly rotation means "fresh starts" (less intimidating for new players)
- Friend leaderboards are always visible (smaller, achievable rankings)

### Risk: Weekly Challenges Feel "Mandatory"

**Mitigation:**
- Max 5 challenges/week; do any 3 for full reward
- Challenges designed for existing gameplay (not artificial gates)
- Dismiss UI after completion (no shame if unfinished)
- No exclusivity (seasonal cosmetics remain earnable next season at 50% cost)

### Risk: Seasonal Pass Feels Unfinished Mid-Season

**Mitigation:**
- Cosmetics distributed evenly (not all at end)
- Challenges refresh weekly (always new content to unlock)
- Free track matches 80% of premium cosmetics (choice, not FOMO)
- Cosmetics stay purchasable post-season (just cost more coins)

---

## 9. Implementation Roadmap (Phased)

### Phase 1: Foundation (Sept 2026)
- [ ] Seasonal Pass UI & data model
- [ ] Weekly Challenge system
- [ ] Daily Streak overhaul
- [ ] Cosmetics rarity display
- [ ] New player tutorial sequence

**Effort:** 3 weeks (backend + frontend + i18n)
**Risk:** Low (mostly new features, no breaking changes)

### Phase 2: Minigame Depth (Oct 2026)
- [ ] Parkour Hard Mode
- [ ] Drift reverse tracks + weather
- [ ] Leaderboard mode rotation
- [ ] Replayability metrics

**Effort:** 2 weeks
**Risk:** Medium (3D generation complexity for Hard Mode)

### Phase 3: Social (Nov 2026)
- [ ] Friend leaderboards
- [ ] World badge rarity display
- [ ] Trading reward boost
- [ ] Presence indicators

**Effort:** 1.5 weeks
**Risk:** Low (existing infrastructure)

### Phase 4: Holiday + Season Finale (Dec 2026)
- [ ] Holiday cosmetics
- [ ] Double rewards campaign
- [ ] Annual rankings export
- [ ] Season 2 teaser

**Effort:** 1 week
**Risk:** Low

### Phase 5+: Guild System, MP Raid (Jan 2027+)
- [ ] Guild creation & management
- [ ] Team Boss-Fight mode
- [ ] Guild Hall of Fame
- [ ] Seasonal pass Season 2

**Effort:** 4 weeks
**Risk:** High (new multiplayer coordination layer)

---

## 10. Communication Strategy

### For New Players
- **Onboarding:** "Welcome to Zoo Empire — Tap, Collect, Play, Compete"
- **Key Message:** "Cool minigames + cosmetics unlock as you play"
- **CTA:** Download, tap hero, buy first animal

### For Existing Players
- **Pre-Season Email:** "Season 1 Starts Sept 1 — 30+ new cosmetics, weekly challenges, and a NEW Parkour hard mode!"
- **In-Game:** Seasonal pass progress bar + weekly challenge preview
- **Monthly Highlight:** "New leaderboard modes, new cosmetics, new minigame challenge — [PLAY NOW]"

### For Community
- **Roadmap:** Update public roadmap with seasonal dates
- **Discord:** Highlight top leaderboard players each week (PR + cosmetic giveaway)
- **Social:** Share "Top 10 Weekly" on Twitter weekly

---

## 11. Design Principles (For Future Features)

1. **Cool Beats Difficult**
   - A feature that looks cool and is easy to use beats a powerful feature that's hard to explain
   - Minigames look cool (3D, visual polish); leaderboards are simple to grok

2. **Progression Should Feel Like Discovery**
   - New player unlocking their first animal shouldn't feel like "grinding"
   - Seasonal cosmetics should feel like rewards, not paywalls

3. **Economy Should Reward All Play Styles**
   - Tap-grinders get multiplier upgrades
   - Minigame fans get cosmetics + coins
   - Social players get trading bonuses + friend standings
   - Idlers get offline income

4. **Cosmetics Should Have Narrative**
   - A cosmetic isn't cool just because it looks good; it should **mean** something
   - "Ranger Outfit = I beat Parkour hard mode" is cooler than just "Ranger Outfit = costs 500k coins"

5. **Engagement Should Never Feel Like Work**
   - 5 weekly challenges, do any 3 (not "do all or you're failing")
   - Streaks have forgiveness (2 skips/month)
   - No seasonal FOMO (cosmetics stay buyable, just pricier)

---

## Conclusion

Zoo Empire's foundation is **exceptionally strong**. This roadmap's goal is to:

1. **Clarify the core loop for new players** (onboarding, early rewards)
2. **Create meaningful engagement loops** (daily streaks, weekly challenges, seasonal progress)
3. **Make cosmetics *mean something*** (achievements, rarity, narrative)
4. **Expand social gravity** (friend standings, team play, spectacle)
5. **Deliver monthly momentum** (new content, new leaderboard modes, seasonal events)

The result: A game that's cool for **both** the newcomer tapping their first lion **and** the veteran chasing rank-1 on the Parkour Hard Mode leaderboard.

---

**Prepared by:** Claude (AI Agent)  
**Date:** August 31, 2026  
**Repository:** [Zoo Empire](https://github.com/dan17612/web-idle-game)
