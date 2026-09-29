# Zoo Empire — Spieler-Wachstum & Retention Roadmap

**Status:** Strategiedokument für nächste 3 Quartale  
**Datum:** 2026-09-12  
**Zielgruppen:** Neulinge (Tag 1–7) & Veteranen (Woche 2+)

---

## 🎯 Problemstellung

Zoo Empire hat solide Features (Minispiele, Soziales, Progression), aber zwei kritische Lücken:

1. **Neulinge verlassen früh** — Kein erkennbarer "Aha-Moment" in Session 1–3
   - Langwierige Progressionscurve (erste besondere Tiere kosten viel)
   - Unklare Monetarisierung & Feature-Entdeckung
   - Tutorial-Bubbles existieren, aber unstrukturiert

2. **Veteranen-Engagement** — Zu wenig Ziele nach ersten 2 Wochen
   - Keine Seasonal Events oder sichtbaren Meilensteine
   - Endgame-Content außer Leaderboards fehlt
   - Cosmetics/Personalisierung sind oberflächlich

---

## 📊 Roadmap nach Priorität

### **Phase 1 (Okt–Nov 2026): Neulinge-Retention — "First Week Win"**

Ziel: Mindestens 40 % der Spieler Tag 7 erreichen (von ggw. ~15 %).

#### 1.1 Strukturiertes Onboarding-Quest-System
- **Was:** Tutorial-Progression mit 5–8 Quest-Steps (nicht invasiv wie Modal-Spam)
  - Step 1: "Tippe die Wiese an für Coins" (Farm-Kern verstehen)
  - Step 2: "Kaufe dein erstes Tier" (Economy verstehen)
  - Step 3: "Entdecke ein Minispiel" (Abwechslung zeigen)
  - Step 4: "Sende Coins an einen Freund" (Social)
  - Step 5: "Klettere in die Rangliste" (Goals)
  
- **Tech:** Neue Tabelle `onboarding_progress` (user_id, current_step, completed_at)
  - RPC `complete_quest_step(step_id)` mit RLS
  - Flag in `profiles.onboarding_completed` (wird bei Step 5 gesetzt)
  - Client-seitig: `useOnboardingQuest()` Composable mit Step-Tracking

- **UI/UX:** 
  - ✨ Checkmark-Animation wenn Step done
  - Rewards pro Step (kleine Bonuscoin oder Kosmetik)
  - `GameView` zeigt aktuelle Quest-Bubble dynamisch (nicht immer sichtbar)
  - Freiwillig: Skip Button nach 3 Steps

- **Metriken:** `app_analytics` SQL Trigger `onboarding_step_* → PostHog/Mixpanel`

---

#### 1.2 Boosted Early Progression ("Honeymoon Phase")
- **Was:** Tiere 1–3 sind schneller erreichbar (3x Coin-Multiplikator in Session 1–3)
  - Küken: weiterhin 50 Coins (schnell)
  - Huhn: 250 → 125 Coins (Tag 1 erreichbar mit Tapping + offline)
  - Hase: 1200 → 600 Coins (by Day 2 machbar)

- **Tech:** Neue Spalte `species_costs.starter_boost_until` (ISO-Timestamp)
  - RPC `buy_animal` prüft `NOW() < starter_boost_until` und Rabatten
  - Flag: `shop_purchase.used_starter_discount` (Missbrauch-Prevention)

- **Warum:** Psychology — "Ich besitze bereits 5 Tiere!" motiviert mehr als "Preis: 1M Coins"

---

#### 1.3 Guided First Minigame ("Parkour Teaser")
- **Was:** Nach Step 3 der Quests: Force-Launch des leichten Parkour-Minigames
  - Pre-built easy level (keine Obstacle, nur Gleitbahn)
  - Reward: 500 Coins (nicht zu groß, aber sichtbar)
  - Einmalig, dann optional

- **Tech:** Route `/parkour?tutorial=1` mit Flag in localStorage `parkour_tutorial_done`
  - GameView zeigt grüner Button "🎮 Probiere Parkour" (Quick Action)
  - TutorialBubble guided durch die 3 Tasten

---

#### 1.4 "Comeback" E-Mails & Push-Notifications
- **Was:** Wenn Spieler 2+ Tage nicht spielt:
  - Email "Dein Zoo vermisst dich!" + Offline-Earnings-Vorschau
  - In-App Notification beim Zurückkommen (optional Push API)

- **Tech:** Supabase Cron (`pg_cron`) + Edge Function `player-re_engagement-mailer`
  - Trigger: `last_seen < NOW() - INTERVAL '2 days'` AND `last_email_sent < NOW() - INTERVAL '3 days'`
  - Prevent Spam: Flag `profiles.last_reengagement_email_at`

---

### **Phase 2 (Dez 2026–Jan 2027): Veteranen-Content — "Endgame Goals"**

Ziel: Wöchentliche wiederkehrende User (DAU/MAU-Verhältnis) auf 35 % erhöhen.

#### 2.1 Seasonal Battle Pass System
- **Was:** Monatliche Season (30 Tage) mit 50 Quest-Tiers
  - Free Tier: 0–20 (Cosmetics, kleine Münzen)
  - Premium Tier: 20–50 (Seltene Tiere, Emote-Set, Titel)
  
  Quest-Beispiele:
  - "Verdiene 50k Coins diese Woche"
  - "Spieliere 3 Minigames"
  - "Sende 100 Coins an Freunde"
  - "Erreiche Position Top 50 in Leaderboard"

- **Tech:** Neue Tabellen `season_pass`, `season_pass_tiers`, `player_season_progress`
  - RPC `claim_season_tier(tier_id)` mit RLS
  - `SeasonsView.vue` mit Progress-Bar + Tier-List
  - Quest-Tracking automatisiert über DB Trigger + Background Job

- **Monetarisierung (Optional):** 
  - Premium Pass: 5 EUR / Monat (Unlock Tiers 20–50 sofort für Zahler)
  - Cosmetics buyable mit `Season-Coins` (verdient nur durchs Pass-System)

---

#### 2.2 Achievements & Titles System
- **Was:** 30+ Achievements (Bronz/Silber/Gold) mit sichtbarem Profil-Badge
  - "Drachen-Sammler" (3 Drachen besitzen)
  - "Leaderboard-Champion" (Top 10 erreicht)
  - "Parkour-Meister" (10× Parkour ohne Fehler)
  - "Zoo-Diplomat" (50 Freunde)

- **Tech:** Tabellen `achievements`, `player_achievements` + Trigger-basiert
  - Spiel-Events schreiben in `player_events` Queue (buy, gift, minigame_win, etc.)
  - Async Worker / Cron prüft Achievement-Bedingungen & claims
  - Profile zeigt Top 5 Achievements + Title (z. B. "der Wilde Panda-König")

---

#### 2.3 Guild/Clan-System (Light Version)
- **Was:** 2–20 Spieler können einen Zoo-Club gründen
  - Gemeinsame Kasse (Pool 20 % der Coins, um sie zu teilen)
  - Wöchentliche Gruppe-Quests ("Alle zusammen 1M Coins verdienen")
  - Leaderboard von Clubs statt nur Spielern
  - Discord-Webhooks für Guilds-Meldungen

- **Tech:** Neue Tabelle `guilds`, `guild_members`, `guild_pool`
  - RPC `create_guild(name)`, `join_guild(code)`, `contribute_to_pool`
  - `GuildView.vue` mit Members, Pool-Status, Weekly-Quest-Tracking

---

#### 2.4 Cosmetics Shop — Zoo-Personalisierung
- **Was:** Alte Tiere können gekauft, neue Varianten (Skins) erhalten
  - Drache: Normal, Gold-Edition, Neon-Edition (~200–500 Season-Coins)
  - Zoo-Dekorationen: Brunnen, Statuen, Themenwechsel
  - Charakter-Emotes: 50+ kleine Animationen (Segen, Tanz, etc.)

- **Tech:** Neue Spalte `world_items.cosmetic_tier`, `profiles.equipped_cosmetics` JSON
  - `CosmeticsShopView.vue` mit Filter + Vorschau im 3D-World
  - RPC `equip_cosmetic(item_id)` mit RLS

---

### **Phase 3 (Feb–Mar 2027): Community & Events — "Spieler-Bindung"**

Ziel: Wöchentliche Social Features, damit Spiel "lebendig" wirkt.

#### 3.1 Live Events & Limited-Time Dungeons
- **Was:** Wöchentlich neue "Boss"-Dungeons (3×7 Tage)
  - Boss 1: "Wildschweiner-König" (Parkour-ähnliche Challenge)
  - Reward Ladder: Silber-, Gold-, Platin-Tiere (diese Saison-exklusiv)
  - Co-op Möglichkeit: 2–4 Spieler können zusammen Boss bekämpfen

- **Tech:** Neue Tabelle `live_events`, `dungeon_runs`, `boss_leaderboard`
  - Edge Function generiert Event-Start-Zeit & Rotation
  - `DungeonView.vue` mit Boss-HP, Team-Übersicht, Loot-Animation

---

#### 3.2 "Friend Challenges" — 1v1 Minigames
- **Was:** "Fordere Spieler X zu Parkour heraus" → Beide spielen das gleiche Level
  - Höhere Score gewinnt Coins vom Verlierer (kleine Stakes, 100–500)
  - Wöchentliche Ranking (wer hat beste Challenge-Win-Rate)

- **Tech:** Neue Tabelle `challenges`, `challenge_plays`
  - Beide spieler schicken Level-Hash + Replay-Daten
  - Vergleich der Scores, Coin-Transfer via RPC

---

#### 3.3 Discord Integration
- **Was:** OAuth-Connect für Discord + Webhooks
  - Spieler können Guild-Updates an Discord-Channel schreiben
  - Achievement Announcements: "@user earned Dragon Master"
  - Leaderboard Digest täglich im Discord

- **Tech:** Neue Spalte `profiles.discord_id`, Supabase Edge Function für Webhooks

---

## 📅 Implementation Timeline

| Phase | Zeitraum | Priorität | Effort | Owner |
|-------|----------|-----------|--------|-------|
| 1.1 Onboarding Quests | Okt 1–15 | 🔴 P0 | 3d | Frontend |
| 1.2 Boosted Early Progression | Okt 1–8 | 🔴 P0 | 1d | Backend |
| 1.3 Guided Parkour Teaser | Okt 8–15 | 🟡 P1 | 2d | Frontend |
| 1.4 Re-engagement Emails | Okt 16–31 | 🟡 P1 | 2d | Backend |
| **2.1 Seasonal Pass** | Dez 1–31 | 🟡 P1 | 5d | Full Stack |
| **2.2 Achievements** | Jan 1–15 | 🟡 P1 | 3d | Backend + Frontend |
| **2.3 Guilds** | Jan 16–31 | 🟢 P2 | 4d | Full Stack |
| **2.4 Cosmetics Shop** | Feb 1–15 | 🟢 P2 | 3d | Frontend + 3D |
| **3.1 Live Events** | Feb 16–Mar 15 | 🟢 P2 | 4d | Full Stack |
| **3.2 Friend Challenges** | Mar 1–15 | 🟢 P2 | 3d | Frontend |
| **3.3 Discord Integration** | Mar 16–31 | 🟢 P3 | 2d | Backend |

---

## 🎨 Design & Tone

- **Neulinge-Onboarding:** Spielerische, nicht-invasive Sprache ("Willkommen im Zoo!")
- **Veteranen-Features:** Kompetitiv & Collectible-fokussiert ("Rare Edition")
- **Konsistenz:** Alle Rewards zeigen dieselben `--token` Farben & Animations

---

## 📊 Success Metrics

| KPI | Baseline | Target (Q4 2026) | Target (Q1 2027) |
|-----|----------|------------------|------------------|
| Day 1 Retention | 40 % | 55 % | 60 % |
| Day 7 Retention | 15 % | 35 % | 45 % |
| DAU / MAU | 18 % | 25 % | 35 % |
| Avg Session Length | 8 min | 12 min | 15 min |
| Seasonal Pass Adoption | — | 22 % (free tier) | 12 % (premium) |
| Community (Guilds) | — | — | 40 % in active guild |

---

## 💭 Open Questions

1. **Monetarisierung:** Premium Pass Preis? Ad-basiert oder IAP-only?
2. **Multi-Platform:** Android App Priorität? (Aktuell Web-first via Capacitor)
3. **Balancing:** Wie schnell sollten Veteranen 100M Coins verdienen? Inflation?
4. **Lokalisierung:** De/En/Ru ausreichen oder mehr Sprachen?

---

## Nächste Schritte

1. **Review mit Design/PMs** — Feedback auf Roadmap einarbeiten
2. **Spec-Docs schreiben** — Für jede Phase ein `2026-{MM}-{DD}-{feature}-design.md`
3. **Sprint Planning** — Phase 1 Tasks in Backlog
4. **Analytics Setup** — Events tracken für Metriken

