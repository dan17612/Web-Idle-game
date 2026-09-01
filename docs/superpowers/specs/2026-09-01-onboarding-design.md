# Onboarding Phase 1 — Guided First-Time Experience (Design-Spec)

**Datum:** 2026-09-01  
**Status:** Spec für Phase 1  
**Autor:** Zoo Empire Product Team  
**Abhängig von:** Plan `2026-09-01-onboarding-und-progression.md`

---

## 🎯 Ziel

Neulinge sollen nach dem ersten Login in weniger als 5 Minuten verstehen:
1. **Was ist dieses Spiel?** (Tier-Sammlung, Idle-Mechanik, Offline-Einkommen)
2. **Was mache ich als Erstes?** (Tier kaufen, Lieblings-Tier wählen, Tappen)
3. **Wie verdiene ich Münzen schnell?** (Tappen + Minispiele)
4. **Welche spannenden Features gibt es später?** (Teaser für Minispiele, Zoo-Welt, Freunde)

---

## 📱 Flow: Guided Modal Sequence

### Screen 1: **"Welcome to Zoo Empire"**
```
┌─────────────────────────┐
│ 🦁 Zoo Empire           │
│ ─────────────────────── │
│                         │
│  Sammle Tiere, verdiene │
│  Coins offline und      │
│  spiele Minispiele!     │
│                         │
│  [→ Weiter]             │
└─────────────────────────┘
```

**Inhalt:**
- Großes Hero-Emoji (🦁)
- Kurze Hook (1–2 Sätze Deutsch)
- Button "→ Weiter"

**Styling:**
- Card mit `--accent` Gradient-Hintergrund
- Text: weiß auf dunklem Hintergrund
- Font: Bold, 18px
- Safe-Area-respektierend

---

### Screen 2: **"Kern-Mechanik: Tiere sammeln"**
```
┌─────────────────────────┐
│ 🐣 Tier-Sammlung        │
│ ─────────────────────── │
│                         │
│  Kaufe Tiere im Shop.   │
│  Jedes Tier verdient    │
│  Dir Coins — auch wenn  │
│  Du offline bist!       │
│                         │
│  💰 Bis zu 8 Std.       │
│  offline Einkommen      │
│                         │
│  [← Zurück] [→ Weiter]  │
└─────────────────────────┘
```

**Inhalt:**
- Icon + Titel
- 2–3 Punkte erklären (Tiere kaufen → passives Einkommen → Offline-Support)
- Progress-Dots: `● ○ ○`

**Interaktion:**
- "Zurück" (vorheriges Screen)
- "Weiter" (nächstes Screen)

---

### Screen 3: **"Dein erster Tier – Jetzt!"**
```
┌─────────────────────────┐
│ 🛍️ Erstes Tier kaufen   │
│ ─────────────────────── │
│                         │
│  Du hast 100 Coins      │
│  Starter-Bonus!         │
│                         │
│  🐤 Küken — 50 Coins    │
│     Verdient 0.5 Coins/ │
│     Sekunde             │
│                         │
│  [← Zurück] [Kaufen →]  │
└─────────────────────────┘
```

**Inhalt:**
- Zeige aktuelles Coins-Balance
- Highlight 1 empfohlenes Tier (z. B. Küken)
- Preis + Einkommen klar anzeigen
- Progress: `○ ● ○`

**Interaktion:**
- "Zurück" → zu Screen 2
- "Kaufen →" → ruft `buy_animal` RPC auf, geht zu Screen 4

---

### Screen 4: **"Glückwunsch! Wähle deinen Liebling"**
```
┌─────────────────────────┐
│ ⭐ Dein Liebling        │
│ ─────────────────────── │
│                         │
│  [🐤] [🐁] [🐰]         │
│                         │
│  Dein Liebling verdient │
│  +100% mehr Coins beim  │
│  Tappen!                │
│                         │
│  [← Zurück] [Weiter →]  │
└─────────────────────────┘
```

**Inhalt:**
- Zeige alle derzeit besessenen Tiere (kleine Emoji, 3er-Grid)
- Erkläre Liebling-Bonus (x2 income beim Tappen)
- Progress: `○ ○ ●`

**Interaktion:**
- Tippe auf ein Tier → setzt es als Liebling
- "Weiter →" → zu Screen 5

---

### Screen 5: **"Tappen = Münzen verdienen"**
```
┌─────────────────────────┐
│ 👆 Tap-Mechanik         │
│ ─────────────────────── │
│                         │
│  Tippe auf deinen       │
│  Liebling und verdiene  │
│  {coinPerTap} Coins!    │
│                         │
│  Du hast 10 Taps pro    │
│  Minute verfügbar.      │
│                         │
│  [← Zurück] [Test →]    │
└─────────────────────────┘
```

**Inhalt:**
- Erkläre Tap-Mechanik & Tap-Limit
- Zeige Icon des gewählten Lieblings
- Progress: `○ ○ ○ ●` (placeholder für später)

**Interaktion:**
- "Test →" → Zeige Live-GameView mit aktiviertem Tap-Button, aber noch in Modal
- Spieler kann 2–3 Mal tappen, sieht Live-Coin-Update
- Danach "Weiter →"

---

### Screen 6: **"Minispiele = Extra-Coins & Tickets"**
```
┌─────────────────────────┐
│ 🎮 Minispiele           │
│ ─────────────────────── │
│                         │
│  🧠 Memory              │
│  🏎️ Drift-Rennen        │
│  🐾 Zoo-Parkour         │
│  🟩 Zoo-Wordle          │
│  🌍 Zoo-Welt            │
│                         │
│  Verdiene Tickets &     │
│  Bonus-Coins!           │
│                         │
│  [← Zurück] [Fertig →]  │
└─────────────────────────┘
```

**Inhalt:**
- Grid oder vertikale Liste der 5 wichtigsten Minispiele
- Kurze Beschreibung (z. B. "Memory: Tier-Paare finden, Truhen verdienen")
- Emoji + Name
- Progress: `○ ○ ○ ○ ●` (letzte Screen)

**Interaktion:**
- "Fertig →" → Modal schließt, setzt `tutorialStep = 1`
- Neu-Spieler sehen jetzt volle GameView mit Progressive-Feature-Unlock

---

## 🎨 Technische Details

### Modal-Komponente: `GuidedOnboardingModal.vue`

**Props:**
```javascript
{
  visible: Boolean, // Gesteuert von GameView basierend auf game.tutorialStep
  currentScreen: Number, // 0–5
  playerCoins: Number,
  favoriteAnimalEmoji: String,
}
```

**Events:**
```javascript
@next-screen() // Gehe zu next screen
@prev-screen() // Gehe zu prev screen
@complete()    // Modal schließt, setzt tutorialStep = 1
@buy-animal(species) // RPC-Aufruf im Parent
```

### GameView Integration

**Logik:**
```javascript
const showGuidedModal = computed(() => {
  return (
    auth.isAuth &&
    game.joinedAt && 
    Date.now() - new Date(game.joinedAt).getTime() < 24 * 60 * 60 * 1000 && // < 24h alt
    game.tutorialStep === 0 // nicht bereits abgeschlossen
  )
})

function completeGuided() {
  game.setTutorialStep(1)
  showGuidedModal.value = false
}
```

### Styling

- **Modal Backdrop:** `position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000`
- **Modal Card:** `max-width: 100%; width: 90vw; max-height: 90vh; padding: var(--space-4); border-radius: var(--radius)`
- **Navigation:** `display: flex; gap: 8px; justify-content: space-between` (Zurück/Weiter)
- **Emojis:** `font-size: 32px` (Screen 1–2), `font-size: 24px` (Screen 3+)
- **Color-Scheme:** Tokens `--bg`, `--card`, `--accent`, `--accent-2`

---

## 🔄 Progressive Feature-Unlock: "Level-Gate"

Nach Guided Modal können Neulinge auf GameView scrollen. Nicht alle Sections sind sofort sichtbar.

### Level 1–5: **Tapping Basics**
Sichtbar:
- Hero Section (Tap-Button + Income)
- Team/Favorite Section (minimiert)
- Quick-Actions: nur **"Shop"** & **"Tappen"**

Versteckt:
- Tap-Upgrades (später freigeben)
- Crafter & Fusion
- Minispiele-Links

### Level 5–15: **Minispiel-Einstieg**
Zusätzlich sichtbar:
- Memory + Drift Quick-Action Buttons
- Hint: "Neues Minispiel freigeschaltet! 🎮"

### Level 15–40: **Advanced Minispiele**
Zusätzlich sichtbar:
- Parkour + Wordle Quick-Action Buttons

### Level 40+: **Endgame & Social**
Zusätzlich sichtbar:
- Zoo-Welt + Friends Quick-Actions
- Boss-Fight
- Crafter & Fusion Machines

---

## 🎯 Achievement-System (Light-Variante)

Nach dem Guided Modal aktiviert sich folgende Auto-Tracking:

| Achievement | Trigger | Reward | Icon |
|-------------|---------|--------|------|
| **"First Steps"** | Beende Guided Modal | 10 Coins | 🎁 |
| **"Animal Lover"** | Kaufe erstes Tier | 50 Coins | 🐣 |
| **"Tapper!"** | Tap 100x | 100 Coins | 👆 |
| **"Memory Master"** | Gewinne Memory 1x | 100 Tickets | 🧠 |
| **"Drifter"** | Finish Drift 1x | 100 Tickets | 🏎️ |
| **"Parkour Pro"** | Finish Parkour 1x | 200 Tickets | 🐾 |
| **"Word Wizard"** | Finish Wordle 1x | 200 Tickets | 🟩 |
| **"Explorer"** | Enter Zoo-Welt 1x | 500 Coins | 🌍 |

**DB-Schema:**
```sql
CREATE TABLE achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

CREATE TABLE achievement_definitions (
  key TEXT PRIMARY KEY,
  emoji TEXT,
  title TEXT,
  description TEXT,
  reward_coins INT DEFAULT 0,
  reward_tickets INT DEFAULT 0
);
```

---

## 📊 Tracking & Analytics

Folgende Events sollten getrack werden (via Vercel Analytics oder custom):

```javascript
// Bei Modal-Start
analytics.track('onboarding_guided_started', {
  joined_at: game.joinedAt,
  device: navigator.userAgent
})

// Bei jedem Screen-Wechsel
analytics.track('onboarding_screen_viewed', { screen: currentScreen })

// Bei Modal-Abschluss
analytics.track('onboarding_guided_completed', {
  duration_sec: (Date.now() - startTime) / 1000,
  screens_total: 6
})

// Bei erstem Tier-Kauf (innerhalb Modal oder nicht)
analytics.track('first_animal_purchased', {
  species: speciesKey,
  during_onboarding: true/false
})
```

---

## ✅ Testing-Checkliste

- [ ] Modal zeigt sich nur bei Neulinge (< 24h)
- [ ] Alle 6 Screens sind navigierbar (vor/zurück)
- [ ] Screen 3: Tier-Kauf-Button funktioniert, RPC wird gerufen
- [ ] Screen 4: Favorite-Auswahl setzt den Lieblings-Tier korrekt
- [ ] Screen 5: Live-Tap-Preview funktioniert, Coins aktualisieren sich
- [ ] Nach "Fertig": `tutorialStep` wird auf 1 gesetzt, Modal schließt
- [ ] Game-View wird nach Modal-Schließung gezeigt
- [ ] Mobile-Responsive: Modal passt auf alle Bildschirmgrößen
- [ ] Accessibility: Alle Buttons haben Labels, Farb-Kontrast ≥ 4.5:1

---

## 🚀 Rollout-Plan

1. **Branch:** `feat/onboarding-phase1`
2. **PRs:**
   - PR 1: `GuidedOnboardingModal.vue` Komponente
   - PR 2: `GameView.vue` Integration + Logic
   - PR 3: Achievement-System DB-Schema + RPC
   - PR 4: Analytics & Testing
3. **Staging:** Deploy zu Staging-Umgebung, QA testet alle Flows
4. **Canary:** 20% der Nutzer, 48h Monitoring
5. **Full-Rollout:** 100% nach Validation

---

## 📚 Referenzen

- `src/components/TutorialBubble.vue` — ähnliche Modal-Komponente
- `src/views/GameView.vue` — Parent-Integration
- `src/stores/game.js` — tutorialStep Verwaltung
- `docs/superpowers/plans/2026-09-01-onboarding-und-progression.md` — übergreifender Plan
