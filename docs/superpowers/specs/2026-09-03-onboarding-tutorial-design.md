# Onboarding Tutorial — Design Spec

**Datum:** 2026-09-03  
**Owner:** @claude  
**Status:** Proposal  
**Priority:** 🔴 CRITICAL (Retention Booster)

---

## Übersicht

Neuen Spielern eine 2-minütige interaktive Einführung geben, die:
- Die Core Loop erklärt (Tier kaufen → Coins verdienen)
- Erste Erfolg garantiert
- Selbst-gelöst wird (kein längeres Watching erforderlich)

---

## Flow Diagram

```
Login erfolgreich
        ↓
   [Hat user 'onboarded' flag?]
        ├─ NEIN → Zeige Onboarding Modal
        └─ JA → Gehe zu GameView
        
    Onboarding Modal
        ↓
   [Schritt 1: Tap-Tier]
   Message: "Tippe auf ein Tier, um Coins zu verdienen!"
   Aktion: User tippt auf Tier → +10 Coins
        ↓
   [Schritt 2: Kauf-Tier]
   Message: "Du hast genug Coins! Kaufe ein neues Tier."
   Aktion: User kauft Tier → Bestätigung
        ↓
   [Schritt 3: Minigame]
   Message: "Versuch ein Minigame! Du gewinnst schneller Coins."
   Action: Show 3 Minigame-Optionen (Memory, Drift, Wordle)
        ↓
   [Abschluss]
   Message: "Viel Spaß! Hier deine erste Quest..."
   Set: onboarded = true → Schließe Modal → Zeige First-Win-Quest
```

---

## UI Components

### OnboardingView.vue (neue Route: `/onboarding`)

**Alternative:** Modal in GameView (nicht neue Route)

```vue
<template>
  <div class="onboarding-overlay">
    <!-- Progress Indicator -->
    <div class="progress-dots">
      <div :class="['dot', { active: step === 1 }]"></div>
      <div :class="['dot', { active: step === 2 }]"></div>
      <div :class="['dot', { active: step === 3 }]"></div>
    </div>

    <!-- Step Content -->
    <div class="step-content">
      <component :is="stepComponent" />
    </div>

    <!-- Navigation -->
    <div class="controls">
      <button v-if="step > 1" @click="prevStep" class="btn secondary">Zurück</button>
      <button @click="nextStep" class="btn">{{ step === 3 ? 'Start!' : 'Weiter' }}</button>
    </div>
  </div>
</template>
```

### Schritt 1: Tap-Tier UI

```vue
<div class="step step-1">
  <h2>{{ tx('onboarding.step1.title') }}</h2>
  <p class="instruction">{{ tx('onboarding.step1.desc') }}</p>
  
  <!-- Highlight: Highlighted Tier (z.B. Küken) -->
  <div class="animal-showcase animated-pulse">
    <img :src="animals[0].emoji" alt="Chick" />
  </div>
  
  <p class="hint">{{ tx('onboarding.step1.hint') }}</p>
  
  <div v-if="!tappedOnce" class="tap-hint">👉 Tippe hier!</div>
  <div v-else class="success">✅ +10 Coins verdient!</div>
</div>
```

**i18n Keys:**
```javascript
{
  'onboarding.step1.title': 'Willkommen in Zoo Empire!',
  'onboarding.step1.desc': 'Tiere verdienen für dich Coins — tippe auf eines!',
  'onboarding.step1.hint': '(Diese Aktion funktioniert jeden Tag mehrmals)',
  'onboarding.step2.title': 'Kaufe dein erstes Tier',
  'onboarding.step2.desc': 'Du hast 200 Coins. Das reicht für ein neues Tier!',
  'onboarding.step3.title': 'Verdiene schneller mit Minigames',
  'onboarding.step3.desc': 'Spiele Games, um Bonus-Coins zu erhalten.',
  'onboarding.complete': 'Tutorial abgeschlossen! Auf zu deinem Abenteuer!',
}
```

### Schritt 2: Kauf-Tier UI

```vue
<div class="step step-2">
  <h2>{{ tx('onboarding.step2.title') }}</h2>
  <p class="instruction">{{ tx('onboarding.step2.desc') }}</p>
  
  <!-- Tier-Karte mit Preis-Badge -->
  <div class="animal-card featured">
    <div class="emoji">🐔</div>
    <div class="name">Huhn</div>
    <div class="income">+2 Coins/s</div>
    <div class="price-badge">250 Coins</div>
    <button @click="buyFeaturedAnimal" class="btn full">Kaufe Huhn</button>
  </div>
  
  <p class="info">{{ tx('onboarding.step2.info') }}</p>
</div>
```

### Schritt 3: Minigame-Teaser UI

```vue
<div class="step step-3">
  <h2>{{ tx('onboarding.step3.title') }}</h2>
  <p class="instruction">{{ tx('onboarding.step3.desc') }}</p>
  
  <!-- 3 Minigame-Optionen als Karten -->
  <div class="minigame-options">
    <div class="game-card" @click="previewGame('memory')">
      <div class="icon">🧠</div>
      <div class="name">Memory</div>
      <div class="reward">+50 Coins</div>
    </div>
    <div class="game-card" @click="previewGame('drift')">
      <div class="icon">🚗</div>
      <div class="name">Drift</div>
      <div class="reward">+50 Coins</div>
    </div>
    <div class="game-card" @click="previewGame('wordle')">
      <div class="icon">🔤</div>
      <div class="name">Wordle</div>
      <div class="reward">+50 Coins</div>
    </div>
  </div>
  
  <p class="hint">Versuch es jetzt, oder später in der Game View!</p>
</div>
```

---

## Implementation Details

### Datei-Struktur

```
src/
  components/
    OnboardingStep1.vue     # Tap-Tier
    OnboardingStep2.vue     # Kauf-Tier
    OnboardingStep3.vue     # Minigame-Teaser
  views/
    GameView.vue            # (Modifizieren: Onboarding Modal)
  stores/
    onboarding.js           # State: currentStep, completed
  i18n.js                   # Neue i18n Keys hinzufügen
```

### Backend Changes

**Tabelle:** `profiles` (existiert schon)

Neues Feld:
```sql
ALTER TABLE profiles ADD COLUMN onboarded BOOLEAN DEFAULT FALSE;
```

**RPC:** `mark_onboarded_complete()`

```sql
CREATE OR REPLACE FUNCTION mark_onboarded_complete()
RETURNS JSON AS $$
BEGIN
  UPDATE profiles SET onboarded = TRUE WHERE id = auth.uid();
  RETURN json_build_object(
    'success', TRUE,
    'message', 'Onboarding complete'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Frontend Store (Pinia)

```javascript
// stores/onboarding.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOnboardingStore = defineStore('onboarding', () => {
  const currentStep = ref(1)
  const completed = ref(false)
  const tappedOnce = ref(false)

  const nextStep = () => {
    if (currentStep.value < 3) currentStep.value++
  }
  
  const prevStep = () => {
    if (currentStep.value > 1) currentStep.value--
  }
  
  const completeOnboarding = async () => {
    await supabase.rpc('mark_onboarded_complete')
    completed.value = true
    router.push({ name: 'game' })
  }

  return { currentStep, completed, tappedOnce, nextStep, prevStep, completeOnboarding }
})
```

### GameView Integration

```vue
<template>
  <div class="game-view">
    <!-- Onboarding Modal (nur wenn !onboarded) -->
    <OnboardingModal v-if="!auth.profile?.onboarded" />
    
    <!-- Normaler Game View -->
    <div v-else>
      <!-- Bestehender Inhalt -->
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import OnboardingModal from '@/components/OnboardingModal.vue'

const auth = useAuthStore()
</script>
```

---

## Styling

### CSS-Klassen

```css
/* Onboarding Overlay */
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  z-index: 1000;
}

.progress-dots {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--safe-top);
}

.progress-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.3s;
}

.progress-dots .dot.active {
  background: var(--accent);
  width: 12px;
}

.step-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step {
  text-align: center;
  max-width: 400px;
}

.step h2 {
  font-size: 24px;
  margin-bottom: var(--space-2);
  color: var(--text);
}

.instruction {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.animal-showcase {
  font-size: 80px;
  margin: var(--space-3) 0;
}

.animal-showcase.animated-pulse {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.tap-hint {
  color: var(--accent);
  font-weight: bold;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.success {
  color: var(--success, #4caf50);
  font-size: 18px;
  font-weight: bold;
}

/* Minigame Cards */
.minigame-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--space-2);
  margin: var(--space-3) 0;
}

.game-card {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2);
  cursor: pointer;
  transition: all 0.3s;
}

.game-card:hover {
  border-color: var(--accent);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(244, 169, 18, 0.2);
}

.game-card .icon {
  font-size: 36px;
  margin-bottom: var(--space-1);
}

.game-card .name {
  font-weight: bold;
  margin-bottom: var(--space-1);
}

.game-card .reward {
  color: var(--accent);
  font-size: 12px;
  font-weight: bold;
}

/* Controls */
.controls {
  display: flex;
  gap: var(--space-2);
  padding-bottom: calc(14px + var(--safe-bot));
}

.controls button {
  flex: 1;
}
```

---

## Testing Checklist

- [ ] Neuer Spieler sieht Modal nach Login
- [ ] Schritt 1: Tap funktioniert, +10 Coins angezeigt
- [ ] Schritt 2: Kauf-Button funktioniert, Tier gekauft
- [ ] Schritt 3: Minigame-Vorschau klickbar
- [ ] Abschluss: onboarded Flag gesetzt, Modal geschlossen
- [ ] Bestehende Spieler sehen kein Onboarding
- [ ] Mobile: Responsive auf iPhone SE (375px)
- [ ] i18n: DE/EN/RU korrekt

---

## Success Metrics

- **Completion Rate:** >80% neuer Spieler schließen Onboarding ab
- **Time-to-First-Animal:** <3 Minuten
- **Day 1 Retention:** +20% vs. ohne Onboarding
- **Day 7 Retention:** +10% vs. ohne Onboarding

---

## Migration Script

```sql
-- Migration: 20260903_onboarding_flag.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

-- Bestehende Spieler als "onboarded" markieren
UPDATE profiles SET onboarded = TRUE WHERE created_at < NOW() - INTERVAL '1 day';

-- RPC für Abschluss
CREATE OR REPLACE FUNCTION mark_onboarded_complete()
RETURNS JSON AS $$
BEGIN
  UPDATE profiles SET onboarded = TRUE WHERE id = auth.uid();
  RETURN json_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION mark_onboarded_complete TO authenticated;
```

---

## Abhängigkeiten

- ✅ First Win Loop (sollte nach Onboarding starten)
- ✅ i18n System (bereits implementiert)
- ✅ Bestehende Minigames (bereits live)

---

**Nächste Schritte:**
1. Design-Review durch @daniil
2. Implementation starten
3. QA mit neuen Spielern
4. A/B-Test mit 50% neuer Spieler
