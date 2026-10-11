# Onboarding: Intro-Sequenz & Tutorial für Zoo Empire

**Datum:** 2026-10-02  
**Status:** Design-Spec  
**Bezug:** `2026-10-02-spieler-erlebnis-neue-spieler-retention.md` (Phase 1, Schritt 1.1–1.2)

---

## Übersicht

Nach Login sieht der Spieler eine Intro-Sequenz (Fullscreen, skipbar), dann ein strukturiertes Tutorial mit Bubble-Prompts. Ziel ist es, dem Spieler in unter 3 Minuten beizubringen, dass Zoo Empire um **Tier-Sammlung, passives Einkommen und Tappen für Bonuse** dreht.

---

## 1. Intro-Sequenz (Screen 1)

### Layout

```
┌─────────────────────────┐
│                         │
│  [Animated Zoo Logo]    │  ← Bounce/Pulse, 2s
│                         │
│  🦁 🐘 🐢 [shuffling]    │  ← Tier-Emojis fliegen ein
│                         │
│  "Willkommen im         │
│   Zoo Empire!"          │
│                         │
│  "Sammle Tiere,         │
│  verdiene Coins und     │
│  spiel Minigames."      │
│                         │
│  [Skip] [Start →]       │  ← Bottom buttons
└─────────────────────────┘
```

### Implementierung

**Component:** Neue `IntroSequenceView.vue` (oder Modal in `AuthView.vue`)

**Props/State:**
```javascript
{
  showIntro: false,          // Trigger nach Login
  animationPhase: 0,         // 0=logo, 1=emojis, 2=text
  skipable: true,
  duration: 5000             // ms, dann auto-skip
}
```

**CSS-Animationen:**
- Logo: `@keyframes pulse { 0% { scale: 0.9 } 50% { scale: 1.1 } 100% { scale: 1 } }` — 1.2s
- Tier-Emojis: Staggered `@keyframes slideInRotate` — je 0.3s Delay
- Text: Fade-in 0.8s nach Emojis
- Bei "Skip" oder nach 5s: Fade-out, navigate zu GameView

**i18n Keys:**
```javascript
{
  de: {
    intro: {
      title: "Willkommen im Zoo Empire!",
      subtitle: "Sammle Tiere, verdiene Coins und spiel Minigames.",
      skip: "Skip",
      start: "Abenteuer starten →"
    }
  }
}
```

---

## 2. Tutorial-Bubble Sequenz (Spielablauf)

Nach Intro → GameView mit **Blockern** (CSS `pointer-events: none` auf nicht-fokussierten Elementen).

### Tutorial Steps

#### **Step 1: Dein erstes Tier (Shop)**

**Trigger:** Sofort nach GameView-Load (falls `game.newPlayer`)

**Bubble Position:** Zeige auf Shop-Button (Quick-Action `qa-btn` mit Einkaufstüten-Icon)

**Text:**
```
"Kaufe dein erstes Tier im Shop. 
Tiere verdienen dir passiv Coins!"
```

**Blocker:**
- Shop-Button: `pointer-events: auto` (clickable)
- Alles andere: `pointer-events: none`
- Visuell: Spotlight-Overlay über Shop-Button (halbtransparent Schatten um herum)

**Fortschritt:** Spieler klickt Shop → weiter zu ShopView

---

#### **Step 2: Tier-Auswahl im Shop**

**Trigger:** Nur während Tutorial, sobald ShopView openend

**Bubble Position:** Zeige auf Küken-Card (billigste, erstmalig an Anfänger)

**Text:**
```
"Dieses Küken kostet 50 Münzen 
und bringt dir 0,5 Coins pro Sekunde. 
Kauf es für dein erste Tier!"
```

**Blocker:**
- Küken-Buy-Button: clickable
- Andere Tiere: `pointer-events: none` (grayed out visual feedback)

**Card Info (immer sichtbar):**
```
🐥 Küken
Preis: 50 Münzen
Einkommen: 0,5 Coins/Sek
```

**Fortschritt:** Spieler kauft Küken → zurück zu GameView

---

#### **Step 3: Tappen & Einkommen (Hauptscreen)**

**Trigger:** Nach erstem Tierkauf, GameView

**Bubble Position:** Über Hero-Animal (Küken) & Einkommens-Info

**Text:**
```
"Perfekt! Dein Küken bringt dir 
{coins_per_day} Coins täglich ein, 
auch wenn du offline bist. 
Tippe es für Bonusertrag!"
```

**Visuell:**
- Hero-Animal mit Pulse-Animation
- TAP-Button prominent (mit großem Icon)
- Unter dem Tier: _"{tierName} · +0,5 Coins/s"_
- Income Counter unten zeigt Realtime-Steigerung

**Blocker:**
- TAP-Area: clickable, groß
- Upgrades-Section: disabled
- Quick-Actions: disabled

**Fortschritt:** Nach 5 erfolgreichen Taps → nächster Step (Auto-Continue)

---

#### **Step 4: Upgrades Intro**

**Trigger:** Nach 5 Taps im Step 3

**Bubble Position:** Zeige auf Upgrades-Section (_"👆 Tap-Upgrades"_)

**Text:**
```
"Mit Taps kannst du Upgrades freischalten — 
höhere Einkommen, mehr Taps pro Sekunde, 
längere Offline-Zeit!"
```

**Visuell:**
- Upgrades-Section wird aktiviert
- Zeige die 3 Upgrade-Kategorien:
  - 👆 Multiplikator (next: 10 Coins)
  - 👥 Mehr Taps (next: 15 Coins)
  - 🛌 Offline-Zeit (next: 20 Coins)
- Spotlight auf erste (`Multiplikator`)

**Blocker:**
- Upgrades-Buttons: clickable
- Rest: disabled

**Fortschritt:** Spieler kauft ein Upgrade → nächster Step

---

#### **Step 5: Zweites Tier & Vielfalt**

**Trigger:** Nach Upgrade in Step 4

**Bubble Position:** Zeige auf Shop-Button (wieder)

**Text:**
```
"Ein Tier allein ist langweilig — 
kauf noch ein anderes Tier für mehr Einkommen!"
```

**Visuell:**
- Im Shop, fokussiere auf Huhn (nächst-teuerstes)
- Zeige Einkommens-Bonus wenn beide besessen: "Duo-Bonus: +10% Einkommen"

**Fortschritt:** Spieler klickt Shop → kauft Huhn → zurück zu GameView

---

#### **Step 6: Minigames Sneak Peek**

**Trigger:** Nach 2. Tierkauf

**Bubble Position:** Zeige auf Quick-Action-Grid (_"🎮 Minigames"_ row)

**Text:**
```
"Minigames verdienen schneller Coins! 
Probier Memory, Wordle oder Parkour."
```

**Visuell:**
- Alle Minigame-Buttons sichtbar
- Eines (z. B. Memory) mit Spotlight
- Andere ausgegraut

**Blocker:**
- Memory-Button (oder Minigame deiner Wahl): clickable
- Rest: disabled

**Fortschritt:** Spieler startet Minigame → zum Minigame navigieren → Mini-Spiel startet

---

#### **Step 7: Nach Minigame (Rückkehr & Tutorial-Ende)**

**Trigger:** Spieler beendet (oder skippt) Minigame und kehrt zu GameView zurück

**Bubble Position:** Center Screen

**Text:**
```
"Herzlichen Glückwunsch! 
Du kennst jetzt die Basics von Zoo Empire. 
Viel Spaß beim Spielen!"
```

**CTA:** "Weiter geht's!" (schließt Tutorial)

**Was passiert:**
- Flag `game.tutorialComplete = true` wird gesetzt
- Alle Blocker aufgehoben
- Normales Gameplay startet

---

## 3. Tutorial State Management

### Store (`stores/game.js`)

```javascript
{
  tutorialStep: 0,           // Current step (0-6, or null wenn complete)
  tutorialComplete: false,   // true nach Step 7
  newPlayer: true,           // Reset nach Tutorial
  tutorialBlocks: {},        // Current blocking regions
}

// Methoden:
- advanceTutorial(step): Wechsel zum nächsten Step, update Blocker
- completeTutorial(): tutorialStep=null, tutorialComplete=true
- resetTutorialForDebug(): Für QA
```

### Blocking-Strategie

**CSS-Klasse `.tutorial-blocked`:**
```css
.tutorial-blocked {
  pointer-events: none;
  opacity: 0.3;
  filter: grayscale(50%);
  /* Optional: blur(2px) */
}

.tutorial-focused {
  pointer-events: auto;
  opacity: 1;
  filter: none;
  /* Optional: box-shadow spotlight */
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7),
              inset 0 0 20px rgba(255, 192, 203, 0.5);
}
```

**Anwendung in GameView:**
```vue
<template>
  <div :class="{ 'tutorial-blocked': tutorialBlocking && tutorialStep !== <CURRENT> }">
    <!-- blocked content -->
  </div>
</template>

<script>
const tutorialBlocking = computed(() => game.tutorialStep !== null)
const tutorialStep = computed(() => game.tutorialStep)
</script>
```

---

## 4. Bubble-Komponente (`TutorialBubble.vue`)

**Props:**
```javascript
{
  position: 'top' | 'bottom' | 'left' | 'right' | 'center',  // relative to target
  target: HTMLElement | null,  // Element to point to
  text: String,                 // Bubble text
  cta: String | null,          // Button text (z. B. "Kaufen", "Skip")
  dismissible: Boolean,         // Kann geschlossen werden? (default: false)
  autoProgress: Boolean,        // Auto zum nächsten Step? (default: false)
  autoDismissAfter: Number | null,  // ms, dann auto-dismiss
}
```

**Template:**
```vue
<div class="tutorial-bubble" :class="`bubble-${position}`">
  <div class="bubble-arrow"></div>
  <div class="bubble-content">
    <p>{{ text }}</p>
    <div class="bubble-actions">
      <button v-if="cta" @click="onAction" class="btn-primary">{{ cta }}</button>
      <button v-if="dismissible" @click="onDismiss" class="btn-ghost">Skip</button>
    </div>
  </div>
</div>
```

**Styling:**
- Font: `var(--heading)` Farbe, Medium Size (16px)
- Hintergrund: `var(--card)` mit Schatten
- Border-Radius: `var(--radius)`
- Animated in: Fade + Slide (0.3s)
- Animated out: Fade + Slide (0.2s)

---

## 5. Datenbank: Tracking

### Neue Spalte in `profiles`:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS (
  tutorial_completed_at TIMESTAMP,
  tutorial_step INT DEFAULT 0
);
```

### Nach Tutorial-Abschluss:

RPC `complete_tutorial()`:
```sql
CREATE OR REPLACE FUNCTION complete_tutorial()
RETURNS TABLE(success BOOLEAN) AS $$
BEGIN
  UPDATE profiles 
  SET tutorial_completed_at = NOW(),
      tutorial_step = 7
  WHERE id = AUTH.uid();
  
  -- Grant welcome bonus (z. B. 100 Bonus-Taps)
  UPDATE game_state
  SET bonus_taps = COALESCE(bonus_taps, 0) + 100
  WHERE user_id = AUTH.uid();
  
  RETURN QUERY SELECT TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Analytics Events

Sende an Google Analytics / Mixpanel (wenn verfügbar):

```javascript
// Bei jedem Schritt
analytics.track('tutorial_step', {
  step: game.tutorialStep,
  duration_seconds: (Date.now() - tutorialStartTime) / 1000
})

// Am Ende
analytics.track('tutorial_completed', {
  total_duration_seconds: ...,
  animals_owned: game.animals.length,
  coins_earned: game.coins
})
```

---

## 7. QA Checklist

- [ ] Intro-Sequenz spielt korrekt (Logo → Emojis → Text)
- [ ] Intro kann übersprungen werden
- [ ] Nach 5s auto-skipped Intro
- [ ] Step 1: Shop-Button ist der einzige Clickable
- [ ] Step 2: Nur Küken ist kaufbar (andere grayed out)
- [ ] Step 3: Nach 5 Taps auto-advance
- [ ] Step 4: Upgrade kann gekauft werden, triggert Step 5
- [ ] Step 5: Shop öffnet, Huhn fokussiert
- [ ] Step 6: Minigame-Buttons sichtbar, eines clickable
- [ ] Step 7: Nach Rückkehr vom Minigame Tutorial-Ende
- [ ] Alle Text-Keys localisiert (de/en/ru)
- [ ] Tutorial-Completion wird in Profil gespeichert
- [ ] Neue Spieler sehen Intro, bestehende nicht
- [ ] Mobile: Bubbles fit in viewport, nicht abgeschnitten
- [ ] Dark Mode: Bubbles lesbar in `html.app-dark`

---

## 8. Abhängigkeiten

- Bestehendes `TutorialBubble.vue`
- Shop-View Flow (bereits vorhanden)
- Game Store (mit `tutorialStep`, `tutorialComplete`)
- Analytics Setup (bestehend oder neu)

---

## Nächste Schritte

1. Implementierung: UI + State Management (1–2 Tage)
2. Datenbank: RPC `complete_tutorial()` (2h)
3. Analytics: Event Tracking (1h)
4. QA & Mobile Testing (1 Tag)
5. Live: Beta-Test mit 10 neuen Spielern vor Rollout
