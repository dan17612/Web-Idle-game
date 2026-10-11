# Tutorial & Onboarding — Interaktive Neuling-Einführung

## Ziel

Ein strukturiertes, 8-schrittiges Tutorial mit visuellen Highlights (Spotlight-Overlays), das neue Spieler durch die wesentlichen Mechaniken führt. Nach Completion soll der Spieler wissen:
- Wie man Tiere kauft
- Wie man Coins sammelt (Taps, Minigames)
- Wie die Zoo-Welt funktioniert
- Wie Trading mit Freunden funktioniert
- Dass es mehr Minigames gibt

## Spieler-Segment

- **Zielgruppe:** Spieler mit `tutorialStep < 8` beim ersten Login
- **Fliehweg:** Optionaler "Überspringen"-Button auf jedem Step (für Power-User)
- **Wiederaufnahme:** Spotlight und Button-Highlight auf der zuletzt unvollständigen Stelle

## Technische Architektur

```
┌─ TutorialOverlay.vue ──────────────────────────────────┐
│  1. Spotlight-CSS (halbdurchsichtig schwarzer Ring)    │
│  2. Modal-Dialog mit Text + Video-Hinweis (optional)  │
│  3. Zielbutton wird leuchtend hervorgehoben           │
│  4. Skip-Button + Next-Button                         │
└─────────────────────────────────────────────────────────┘
     │ stores/game.js: game.tutorialStep
     │ supabase: profiles.tutorial_step (persisted)
     │ i18n.js: tutorial.* Keys (de/en/ru)
```

## Tutorial-Schritte

### Schritt 1: Willkommen zur Zoo Empire

**Trigger:** `tutorialStep === 0` on first app load (nur wenn neu)  
**Spotlight-Ziel:** Keine (Fullscreen-Modal)  
**Text (de):** "Willkommen zu Zoo Empire! 🐾 Du wirst Zoos sammeln, Coins verdienen und Abenteuer erleben. Lass uns anfangen!"  
**Action:** "Los geht's!" → `tutorialStep = 1`, Modal schließt

**Tech:**
- `TutorialOverlay.vue` mounted wenn `game.tutorialStep < 8`
- Render nur wenn `step.active === true`
- Spotlight: `::before` pseudo-element mit radial-gradient

---

### Schritt 2: Zoo-Welt besuchen

**Trigger:** `tutorialStep === 1`  
**Spotlight-Ziel:** World-Button in Bottom-Nav (`.router-link[href="#/world"]`)  
**Text (de):** "Das ist dein Zoo! 🌍 Viele andere Spieler sind hier online. Klick auf \"Zoo-Welt\" um sie zu besuchen."  
**Action:** "Klick den Zoo-Button" → Nach Click: `tutorialStep = 2`, Modal schließt

**Tech:**
- Spotlight auf World-Button (pink glow)
- Modal oben links, Pfeil zeigt auf Button
- `@click` Hook auf Button detektiert, RPC `award_xp(10)` aufgerufen (Tutorial-Completion-Reward)

---

### Schritt 3: Erstes Tier kaufen

**Trigger:** `tutorialStep === 2`  
**Spotlight-Ziel:** Shop-View, "Huhn kaufen"-Button (spezifisch auf erste Tier-Card mit `species === 'chicken'`)  
**Text (de):** "Jedes Tier verdient Coins passiv! 💰 Lass uns dein erstes Tier kaufen. Das Huhn kostet nur 250 Coins und verdient 2 pro Sekunde."  
**Precondition:** Spieler hat mindestens 250 Coins (falls nicht: "Klick die Tap-Zone 5× um Coins zu verdienen")  
**Action:** Spieler klickt "Kaufen" → RPC `buy_animal` erfolgt → Toast "Huhn gekauft!" → `tutorialStep = 3`

**Tech:**
- Router navigiert auto zu Shop (`router.push('/shop')`)
- Spotlight + Modal auf erstem Tier
- Button ist `disabled={game.displayCoins < 250}` bis genug Coins da
- Nach buy: `game.tutorialStep++` und lokales `game.load()` refresh

---

### Schritt 4: Tap-Bonus nutzen

**Trigger:** `tutorialStep === 3` UND Spieler ist auf GameView  
**Spotlight-Ziel:** Tap-Zone (`.tap-area` oder großes Tier-Billboard)  
**Text (de):** "Jetzt verdienst du automatisch! Aber du kannst auch tippen für Extra-Coins. 👆 Tippe 10× auf dein Tier."  
**Precondition:** Spieler muss GameView navigieren (auto-redirect nach Schritt 3)  
**Action:** Nach 10 Taps: Counter zeigt "10/10" und wird grün → `tutorialStep = 4`

**Tech:**
- Store-Action `tap()` tracked per Tutorial
- `game.tutorialTapsCount` ref lokal
- Nach 10: Toast + `tutorialStep++`

---

### Schritt 5: Minigame spielen

**Trigger:** `tutorialStep === 4`  
**Spotlight-Ziel:** "Parkour"-Card oder schnellstens verfügbares Minigame  
**Text (de):** "Spielen ist noch besser! 🎮 Versuche ein Minigame. Gewinne und verdiene massive Bonuscoins."  
**Precondition:** Keine (alle Minigames verfügbar)  
**Action:** Spieler startet ein Minigame → Nach RPC Abschluss: `tutorialStep = 5`

**Tech:**
- Spotlight auf Parkour-Button / Drift-Button
- `useGameStore()` Action `playMinigame()` auto-detektiert Tutorial-Status
- Nach minigame finish RPC: if `tutorialStep === 4` then `tutorialStep = 5`

---

### Schritt 6: Offline-Verdienen aktivieren

**Trigger:** `tutorialStep === 5`  
**Spotlight-Ziel:** "Offline-Upgrade"-Card auf GameView  
**Text (de):** "Selbst wenn du offline bist, verdienst du Coins! ⏳ Lass uns das Offline-Limit erhöhen. Das erste Upgrade kostet nur 500 Coins."  
**Precondition:** Spieler hat ≥500 Coins  
**Action:** Spieler klickt Upgrade → RPC `upgrade_offline_level` → `tutorialStep = 6`

**Tech:**
- Button ist `disabled={game.displayCoins < 500}`
- Nach RPC: Toast + `tutorialStep++`

---

### Schritt 7: Mit Freund handeln

**Trigger:** `tutorialStep === 6`  
**Spotlight-Ziel:** Trade-View, "Öffentliches Angebot erstellen"-Button  
**Text (de):** "Handeln macht Spaß! 👥 Erstelle ein Angebot. Du kannst Tiere oder Coins anbieten und andere Spieler können akzeptieren."  
**Precondition:** Spieler hat mindestens 1 Tier oder 1000 Coins  
**Action:** Spieler erstellt öffentliches Angebot (auch wenn niemand akzeptiert) → RPC `propose_trade` → `tutorialStep = 7`

**Tech:**
- Auto-redirect zu Trade-View nach Schritt 6
- Spotlight auf "Neu" / "Erstelle Angebot"-Button
- Nach RPC: `tutorialStep++`

---

### Schritt 8: Glückwunsch + Roadmap

**Trigger:** `tutorialStep === 7`  
**UI:** Modal, fullscreen  
**Text (de):** "🎉 Du hast es geschafft! Du kennst nun die Grundlagen von Zoo Empire. Hier sind deine nächsten Ziele..."  
**Content:**
- Link zu RoadmapView
- Hinweis auf Achievements (später)
- Hinweis auf Minigames im Shop
- "Viel Spaß spielen!" Button

**Action:** Klick → `tutorialStep = 8`, Modal verschwunden  
**Persistence:** `supabase.rpc('set_tutorial_step', { p_step: 8 })` aufgerufen (bestätigt in DB)

---

## I18N Keys

```javascript
// in src/i18n.js

de: {
  tutorial: {
    step1Title: 'Willkommen zu Zoo Empire',
    step1Text: 'Du wirst Zoos sammeln, Coins verdienen und Abenteuer erleben. Lass uns anfangen!',
    step1Btn: 'Los geht\'s!',
    
    step2Title: 'Dein Zoo',
    step2Text: 'Das ist dein Zoo! 🌍 Viele andere Spieler sind hier online. Klick auf "Zoo-Welt" um sie zu besuchen.',
    step2Action: 'Klick den Zoo-Button',
    
    step3Title: 'Erstes Tier kaufen',
    step3Text: 'Jedes Tier verdient Coins passiv! 💰 Lass uns dein erstes Tier kaufen. Das Huhn kostet 250 Coins.',
    step3Precondition: 'Du brauchst 250 Coins. Tippe 5× auf die Tap-Zone oben um genug zu verdienen.',
    step3Action: 'Klick "Kaufen"',
    
    step4Title: 'Tap-Bonus',
    step4Text: 'Jetzt verdienst du automatisch! Aber tippe für Extra-Coins. 👆 Tippe 10×',
    step4Action: 'Tippe 10× auf dein Tier',
    step4Counter: '{done}/10 Taps',
    
    step5Title: 'Minigame spielen',
    step5Text: 'Spielen ist noch besser! 🎮 Versuche ein Minigame. Gewinne und verdiene massive Bonuscoins.',
    step5Action: 'Starte ein Minigame',
    
    step6Title: 'Offline-Verdienen',
    step6Text: 'Selbst wenn du offline bist, verdienst du Coins! ⏳ Das erste Upgrade kostet 500 Coins.',
    step6Action: 'Klick "Upgrade"',
    
    step7Title: 'Mit Freunden handeln',
    step7Text: 'Handeln macht Spaß! 👥 Erstelle ein Angebot. Andere Spieler können akzeptieren.',
    step7Action: 'Erstelle ein öffentliches Angebot',
    
    step8Title: 'Glückwunsch! 🎉',
    step8Text: 'Du kennst nun die Grundlagen von Zoo Empire. Hier sind deine nächsten Ziele...',
    step8Roadmap: 'Zum Roadmap',
    step8PlayOn: 'Viel Spaß spielen!',
    
    skipBtn: 'Überspringen',
    nextBtn: 'Weiter',
    closeBtn: '×',
    noCoinsTip: 'Du brauchst {amount} Coins. Tippe oder spiele ein Minigame.'
  }
}

// en: { tutorial: { ... } }
// ru: { tutorial: { ... } }
```

---

## Komponenten & Files

| Datei | Typ | Zweck |
|---|---|---|
| `src/components/TutorialOverlay.vue` | Component | Spotlight-Modal, alle 8 Schritte |
| `src/composables/useTutorial.js` | Composable | Step-Navigation, Precondition-Checks |
| `src/stores/game.js` | Store | `tutorialStep`, `tutorialTapsCount` |
| `src/i18n.js` | Config | `tutorial.*` Keys |
| `src/tutorial.test.js` | Test | Steps 1–8 Logik, Preconditions |

---

## UX Details

### Spotlight CSS

```css
.tutorial-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(2px);
  z-index: 1000;
}

.tutorial-spotlight {
  position: absolute;
  background: radial-gradient(circle, transparent 0%, rgba(0,0,0,0.85) 100%);
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85);
  transition: all 0.3s ease;
}

.tutorial-modal {
  position: fixed;
  bottom: 80px;
  left: 20px;
  right: 20px;
  max-width: 360px;
  background: var(--card);
  border: 2px solid var(--accent);
  border-radius: 16px;
  padding: 20px;
  z-index: 1001;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.tutorial-arrow {
  width: 2px;
  height: 20px;
  background: var(--accent);
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
}

.tutorial-arrow::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid var(--accent);
}
```

### Animations

- **Spotlight Erscheinen:** Fade-in 300ms + Scale (0.9 → 1.0)
- **Modal Schreiben:** Slide-up von unten 400ms
- **Button-Highlight:** Pulse-Glow (2s repeat)

---

## Fehlerfall & Recovery

| Szenario | Verhalten |
|---|---|
| Spieler überspringt Tutorial | `tutorialStep = 8` sofort, Overlay weg |
| Spieler hat keine 250 Coins für Step 3 | Modal zeigt Precondition-Hinweis + "Tippe hier 5× um zu verdienen" |
| Spieler tauscht Button während Modal | Modal pausiert, wartet auf neuen State, setzt fort |
| Browser-Refresh | `game.tutorialStep` restored aus DB; Spotlight wird auf aktuellen Step neu-positioned |

---

## Performance

- **Overlay lazy-loaded:** Nur render wenn `tutorialStep < 8`
- **Spotlight repositioniert:** Per `requestAnimationFrame` on window resize
- **No infinite loops:** Cada Step hat eindeutige Trigger-Condition
- **Memory cleanup:** `onUnmounted` → Listener entfernt, keine Refs retained

---

## Testing

```javascript
// src/tutorial.test.js

test('Tutorial Schritt 1: Willkommen → Schritt 2 nach Click', () => {
  // Mount TutorialOverlay mit game.tutorialStep = 0
  // Click "Los geht's!"
  // Assert game.tutorialStep === 1
})

test('Tutorial Schritt 3: 250 Coins Precondition', () => {
  // game.coins = 100
  // TutorialOverlay Step 3 rendert
  // Assert "Tippe um Coins zu verdienen" Hinweis sichtbar
  // game.coins = 250
  // Assert "Kaufen"-Button enabled
})

test('Tutorial Schritt 4: 10 Taps Counter', () => {
  // game.tutorialTapsCount = 0
  // Simulate 10 tap() calls
  // Assert tutorialStep === 5
})

test('Tutorial Skip: tutorialStep → 8', () => {
  // Click "Überspringen"
  // Assert tutorialStep === 8 und Overlay hidden
})

test('Tutorial Persistence: Nach Refresh', () => {
  // game.tutorialStep = 4
  // Refresh Browser
  // Assert tutorialStep === 4 (aus DB geladen)
})
```

---

## Success Metrics

| Metrik | Ziel |
|---|---|
| Tutorial Completion Rate | ≥ 60% starten und ≥ 80% vollenden |
| D1 Retention | ≥ 40% von Neulinge kehren Tag 2 zurück |
| Avg Session Length (Tutorial) | ≥ 8 Minuten während Tutorial |
| First Animal Buy Rate | ≥ 85% (mit Tutorial) vs. 60% (ohne) |
| Skip Rate | ≤ 15% (beweist UI ist nicht zu nervend) |
