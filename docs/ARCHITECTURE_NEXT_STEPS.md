# Architecture & Next Steps for Growth

*Ein Leitfaden für die nächste Phase der Zoo-Empire-Entwicklung*

---

## 1. Current Architecture Strengths

✅ **Server-authoritative Economy**
- Alle Transaktionen über `security definer` RPCs
- Client rechnet nie selbst → Cheat-proof
- `game.persist()` vor jedem RPC → Datenkonsistenz

✅ **Component-Based UI**
- PrimeVue 4 für konsistente Design-Language
- Global registrierte Komponenten (Button, InputText, Modal)
- Dark-Mode gut integriert (`--app-dark`)

✅ **3D Engine Pattern** (Three.js)
- Framework-agnostic Klassen (`parkourEngine`, `worldEngine`)
- Memory-leak prevention (`_track()`, `renderer.forceContextLoss()`)
- Pixel-Ratio ≤ 2, keine Echtzeit-Schatten

✅ **Realtime Infrastructure**
- Supabase Presence für Multiplayer (Zoo-Welt)
- Broadcast für Positionen & Emotes
- Keine Wirtschaftstransaktionen über Realtime (richtig!)

✅ **Testing & SQL Validation**
- `src/*.test.js` mit `node --test`
- SQL-Spiegel-Tests (`src/*Sql.test.js`)
- Migrations mit YYYYMMDD-Präfix, RLS-geprüft

---

## 2. Technical Debt & Pain Points

⚠️ **Komplexität der Views**
- `GameView.vue` >1000 Zeilen
- Viele lokale States (coins, taps, busy)
- Refactor-Kandidat: Core-Logic in `src/game.js` weiter auslagern

⚠️ **Migration Constraints**
- `apply_migration` mit `drop...` braucht MCP-Bestätigung
- Cloud-Sessions brechen ab bei `drop` statements
- **Lösung**: Migrationen immer mit `if exists` + eigene Datei für Drops

⚠️ **Realtime Fire-and-Forget Bug**
- `.rpc()` ist lazy — braucht `.then(null, () => {})` oder wird **nie executed**
- Dieser Bug tritt immer wieder auf
- **Lösung**: Wrapper `supabase.rpcFire()` schreiben, der das kapselt

⚠️ **No Automated Backups im Code dokumentiert**
- Supabase hat Backups, aber kein Restore-Playbook in Repo
- **Lösung**: `docs/DISASTER_RECOVERY.md` schreiben

⚠️ **i18n Inconsistency**
- Neuere Views haben lokales `I18N`-Dict + `tx()`
- Ältere Views nutzen globales `i18n.js`
- **Lösung**: Langfristig auf lokale Dicts standardisieren (Better tree-shaking)

---

## 3. Scalability Roadmap

### Phase A: Database Optimization (Now–End Oct)

**Problem**: Mit mehr Features (Guilds, Trading Post) wird Abfrage-Last steigen.

**Actions**:
```sql
-- Index für häufige Queries hinzufügen
CREATE INDEX idx_profiles_coins ON profiles(coins DESC);
CREATE INDEX idx_world_players_user ON world_state(user_id);
CREATE INDEX idx_market_active ON market_list(lister_id) WHERE completed_at IS NULL;

-- Materialized Views für Reports
CREATE MATERIALIZED VIEW weekly_top_earners AS
SELECT user_id, SUM(coins) as total FROM transactions 
WHERE created_at > NOW() - '7 days'::interval
GROUP BY user_id ORDER BY total DESC LIMIT 100;
```

**Implementation**: Eine neue Migration `20261015_performance_indexes.sql`

### Phase B: API Rate Limiting & Quotas (Nov)

**Problem**: Mit Push-Notifications können bots leicht abfeiern.

**Solution**:
- `app_settings` JSON: `{ automation_rules: { ... }, rate_limits: { ... } }`
- RPCs prüfen `_check_rate_limit(user_id, 'chest_buy')` vor Transaktion
- Pro User: max 10 RPCs/min, max 100 chest buys/hour

**Implementation**: Migration + RPC-Wrapper

### Phase C: Event-Driven Architecture (Dec)

**Problem**: Neue Features (Tournaments, Guilds) brauchen Events.

**Solution**: 
- Supabase Webhooks für `events` Tabelle
- Webhook → Cloud Function (Edge Function) → Discord Bot / Email
- Beispiel: User reaches #1 → Discord "🏆 {user} is now #1 in {region}!"

**Implementation**: Edge Function + Webhooks config

---

## 4. New Feature Template

### When Adding a New Feature:
1. **Design Doc first** (`docs/superpowers/specs/YYYY-MM-DD-feature.md`)
2. **Plan** (`docs/superpowers/plans/YYYY-MM-DD-feature.md`) — optional, use for large features
3. **Database** — Migration with RLS + RPCs (server-authoritative)
4. **Logic Layer** — Pure JS module (`src/featureName.js`) + tests
5. **UI Layer** — Vue component (`FeatureNameView.vue` or modal)
6. **Router** — Add route in `src/router.js` if top-level
7. **Integration** — Hook into GameView quick-actions or nav
8. **QA** — Test on desktop & mobile (Capacitor preview)

### Example PR Checklist:
```markdown
- [ ] Design spec reviewed
- [ ] DB schema doesn't break RLS
- [ ] All new RPCs are `security definer`
- [ ] SQL rewards mirror client preview
- [ ] Tests pass: `npm test`
- [ ] Build passes: `npm run build`
- [ ] Dark mode tested
- [ ] Mobile (touch) tested
- [ ] Offline behavior correct
```

---

## 5. Suggested Next Big Features (After Onboarding Phase)

### 🎯 High Impact / Low Complexity

1. **Trading Post 2.0**
   - Direct P2P gear trades (not just animals)
   - Request system (I want X, offer Y)
   - Timeline: 2 weeks
   - Users: Mid-tier players

2. **Tournaments (Weekly)**
   - Leaderboards per minigame
   - Weekly winners get premium currency
   - Server-side score validation
   - Timeline: 3 weeks
   - Users: Competitive players

3. **Breeding Combos**
   - Breed special "hybrid" animals (Lion + Tiger = Liger)
   - Visual rewards, 2x income potential
   - Timeline: 2 weeks
   - Users: Collectors

### 🚀 High Impact / Higher Complexity

4. **Guilds**
   - Teams of 3–10 players
   - Shared treasury, guild battles
   - Weekly challenges with guild rewards
   - Timeline: 6 weeks
   - Users: Social players

5. **Seasonal Pass** ("Battle Pass")
   - Free path: 100 rewards
   - Premium: 200 rewards
   - Visible progress + cosmetics
   - Timeline: 4 weeks
   - Users: All (monetization)

---

## 6. Code Quality & Maintenance

### Lint & Format
```bash
npm run dev          # Dev server with hot-reload
npm test             # All tests (node --test)
npm run build        # Vite build (must be green)
npm run lint         # (If eslint configured)
```

### Recommendations
- Add `pre-commit` hook for tests (via `update-config` skill)
- Add GitHub Actions for CI (test + build on PR)
- Keep AGENTS.md updated with new patterns

### Documentation Standards
- **Every new RPC** gets a comment explaining permissions
- **Every SQL formula** gets a client-side JS mirror with tests
- **Every Vue component** with complex logic gets a JSDoc block

Example:
```javascript
/**
 * Calculate parkour reward based on time and assists.
 * Must match SQL function `_parkour_reward(p_time, p_assists)`.
 * @param {number} timeSeconds - Total time in seconds
 * @param {number} assists - Number of checkpoint hits
 * @returns {number} Coins earned
 */
export function parkourReward(timeSeconds, assists) {
  // ...
}
```

---

## 7. Monitoring & Analytics Setup

### Proposed Metrics Table
```sql
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,  -- 'game_start', 'minigame_complete', 'purchase', etc.
  event_data JSONB,           -- event-specific data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Triggers für wichtige Events
CREATE TRIGGER on_minigame_complete AFTER UPDATE ON game_progress
  FOR EACH ROW WHEN (NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION log_analytics_event('minigame_complete');
```

### Dashboard Ideas (Future)
- Daily Active Users (DAU)
- Feature adoption (% who tried Trading vs. Guilds)
- Churn signals (inactivity > 7 days)
- Revenue per user (if monetization added)

---

## 8. Operational Runbooks

### "Game is Down" Checklist
- [ ] Check Supabase status page
- [ ] Check Postgres query logs: `mcp__supabase__query_logs`
- [ ] Look for new migration issues
- [ ] Restart containers (Capacitor test)
- [ ] Document incident in `docs/INCIDENTS.md`

### "Suspicious Bot Activity" Checklist
- [ ] Check `automation_checks` RPC for recent flags
- [ ] Review `automation_slots` for patterns
- [ ] Manual review of user's transaction history
- [ ] Support team notifies user + bans if needed

### "New RPC Added" Checklist
- [ ] Confirm `security definer` present
- [ ] Confirm `search_path = public` set
- [ ] Confirm `revoke ... from anon, public` at end
- [ ] Confirm tests pass
- [ ] Confirm it won't break cloud migrations

---

## 9. Long-Term Vision (6–12 Months)

- **Regional Leaderboards** (EU, NA, APAC)
- **Guilds** with cross-region tournaments
- **Trading Post 2.0** with gear crafting
- **Premium Currency** (Gems) + cosmetics
- **Mobile Widgets** (offline income reminder, event countdown)
- **Browser Extensions** (quick-check inventory without opening game)
- **Streaming Integration** (Twitch drops, raids)

---

## 10. Getting Started

### For a New Developer:
1. Read `AGENTS.md` (already done!)
2. Run `npm install && npm run dev`
3. Check out `src/animals.js` (core logic example)
4. Review a recent spec: `docs/superpowers/specs/2026-10-08-halloween-update-design.md`
5. Start with a small PR (e.g., add a new cosmetic or fix a visual bug)

### For a Feature Lead:
1. Write a Design Spec in `docs/superpowers/specs/` (use template from existing ones)
2. Get feedback from team
3. Create Plan in `docs/superpowers/plans/` (optional for small features)
4. Execute in small, testable PRs
5. Keep AGENTS.md & this document updated

---

## 11. Questions for the Team

- Should we add Sentry/error tracking? (Recommended for prod)
- Should we monetize? (Premium pass, cosmetics, etc.)
- Should we open-source? (Especially 3D engines)
- Roadmap: What's the next big milestone?

---

**Last Updated**: 2026-10-13  
**Next Review**: 2026-11-13
