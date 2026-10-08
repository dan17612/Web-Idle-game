# 🎮 Onboarding-Tutorial Design

Datum: 2026-10-08  
Feature: Guided Tutorial für Neulinge  
Status: Spec (keine Implementierung noch)

---

## 🎯 Ziel

**Problem**: Neue Spieler verstehen nicht, wie das Spiel funktioniert. Sie loggen ein, sehen die Farm, wissen aber nicht, was zu tun ist → 70% verlassen das Spiel in den ersten 5 Minuten.

**Lösung**: Ein interaktives **5-Schritte-Tutorial**, das Neulinge durch den Hype-Loop führt:
1. Charakter-Erstellung (Avatar, Name)
2. Erstes Tier geschenkt (Erfolg!)
3. Taps lernen (Coins verdienen)
4. Minigames entdecken
5. Marktplatz verstehen

**Erfolg-Metrik**: 
- Retention Day 1 von 30% → 50%
- 90% der Neulinge spielen mindestens 1 Minigame
- NPS +15 Punkte (Onboarding-Feedback)

---

## 📐 Architektur

### Datenspeicher: `profiles.tutorial_step`

```sql
ALTER TABLE profiles ADD COLUMN tutorial_step INT DEFAULT 0;
-- 0 = nicht gestartet
-- 1 = Name gewählt
-- 2 = Erstes Tier erhalten
-- 3 = Taps gelernt
-- 4 = Minigame entdeckt
-- 5 = Marktplatz verstanden
-- 99 = Abgeschlossen (Skip auch möglich)

-- Tracking:
ALTER TABLE profiles ADD COLUMN tutorial_completed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN tutorial_skipped_at TIMESTAMP DEFAULT NULL;
```

### Globale Modal: `TutorialGuide.vue` (Overlay)

Erscheint über aktueller View wenn:
- `auth.user.tutorial_step < 99`
- `!isDismissed('tutorial_step_X')`

---

## 🎬 Tutorial-Flow: Schritt für Schritt

### **Schritt 0: Begrüßung** (nach Login, vor GameView)

**Modal-Inhalt**:
```
🎪 Willkommen in Zoo Empire!

Du wirst hier Tiere sammeln, Münzen verdienen 
und mit anderen Spielern handeln.

[Fortfahren →]  [Überspringen]
```

**Nutzer-Aktion**: Klick auf „Fortfahren"

**Auslöser**: RPC `tutorial_step(p_step=1)` → `profiles.tutorial_step := 1`

---

### **Schritt 1: Charakter-Erstellung** (1 min)

**View**: Neue Seite `/onboarding/character` (oder Modal)

**UI**:
```
┌─────────────────────────────┐
│ 🎪 Dein Zoologe             │
│                             │
│ Name: [TextField]           │ ← minimalistische Eingabe
│                             │
│ Avatar: [5 Optionen]        │ ← Emoji/Icon-Picker
│         🐰 🦁 🐢 🦜 🐘      │    (schnell, nicht zu viel)
│                             │
│ [← Zurück] [Speichern →]    │
└─────────────────────────────┘
```

**Constraints**:
- Name: 3–20 Zeichen, alphanumeric + Unterstrich
- Avatar: Eine Emoji aus der obigen Liste
- Server-Side: `update_profile(p_username, p_avatar)` (name ist Daten, avatar ist Kosmetik)

**Nach Speichern**:
- RPC `tutorial_step(p_step=2)`
- Redirect zu GameView

---

### **Schritt 2: Erstes Tier geschenkt** (30 sec)

**Trigger**: Benutzer ist in `GameView`, `tutorial_step=2`

**Modal (Overlay-Typ)**:
```
┌─────────────────────────────┐
│ 🐥 Willkommen zu deiner Farm!│
│                             │
│ Dein erstes Tier: Küken     │
│                             │
│ [Große animierte Grafik]    │
│ (3D-Modell oder PNG Sprite) │
│                             │
│ Einkommen: 0,5 🪙/Sek      │
│ Level: 1                    │
│                             │
│       [Toll! →]             │
└─────────────────────────────┘
```

**Aktion im Hintergrund**:
- RPC `grant_tutorial_animal()` erstellt 1 Küken
- `animals.insert({ user_id, species_id: 1, level: 1, tier: 1 })`

**Nach Klick**:
- RPC `tutorial_step(p_step=3)`
- Modal schließt

---

### **Schritt 3: Taps Lernen** (2 min)

**Trigger**: `tutorial_step=3`, Spieler sieht jetzt sein Küken in der Farm

**Neue UI-Elemente in GameView**:
1. **Pulsierender Tap-Button**: "Taps verdienen dir Coins! Tippe 3× auf die Farm." (Tooltip)
2. **Counter**: „3 Taps übrig" (wird nach jedem Tap dekrementiert)
3. **Fortschritt**: „du verdienst: +50 🪙" (mit Animation zeigen)

**Mechanik**:
- Jeder Tap gibt normal Coins (gemäß `game.earn()`)
- Counter schaut auf `getTapCount()` im Tutorial-Kontext
- Nach 3 Taps: Modal erscheint

**Tutorial-Modal nach 3 Taps**:
```
┌─────────────────────────────┐
│ ✨ Großartig!               │
│                             │
│ Du verdienst automatisch:   │
│ 🪙 Coins (durch Tiere)      │
│ 🎫 Tickets (via Minigames)  │
│                             │
│ Bereit für mehr?            │
│       [Ja! →]               │
└─────────────────────────────┘
```

**Nach Klick**:
- RPC `tutorial_step(p_step=4)`

---

### **Schritt 4: Minigames Entdecken** (3 min)

**Trigger**: `tutorial_step=4`, Spieler ist in GameView

**UI-Änderungen**:
1. **Quick-Action-Kachel hervorbeben**: Parkour/Wordle wird mit goldener Border + Puls angezeigt
2. **Tooltip**: "Minigames spielen → Tickets verdienen" (Sticky, bis dismissed)
3. **Link-Card**: "🎮 Spieliere Parkour und gewinne Tickets!" mit Bild

**Nutzer spielt 1 Minigame** (beliebiges):
- Tutorial trackt: `tutorial_minigame_played = true`
- Nach Spiel zurück in GameView

**Dann: Fortschritts-Modal**:
```
┌─────────────────────────────┐
│ 🎫 Tickets verdient!        │
│                             │
│ +10 Tickets für dein Spiel! │
│                             │
│ 💡 Tickets → Truhen öffnen  │
│    oder Tiere kaufen        │
│                             │
│  [Verstanden →]             │
└─────────────────────────────┘
```

**Nach Modal**:
- RPC `tutorial_step(p_step=5)`

---

### **Schritt 5: Marktplatz Verstehen** (2 min)

**Trigger**: `tutorial_step=5`

**UI-Änderungen in TradeView**:
1. **Schritt-für-Schritt Info-Panel**:
   ```
   📚 So funktioniert der Marktplatz:
   
   ① Du kannst Tiere anbieten
   ② Andere Spieler kaufen dein Angebot
   ③ Du verdienst Coins!
   
   [Beispiel-Angebot zeigen]
   ```
2. **CTA-Button**: "Mein erstes Tier zum Verkauf anbieten" (hervorgehoben)

**Nutzer-Aktion** (optional, aber encouraged):
- Aktion: "Küken" zum Verkauf anbieten (mit Default-Preis: 50 Coins)
- RPC `create_trade_offer()` normal
- Nach Erstellung: Confetti-Animation, Erfolgs-Toast

**Finale Modal**:
```
┌─────────────────────────────┐
│ 🎉 Tutorial abgeschlossen!  │
│                             │
│ Du beherrschst nun:         │
│ ✅ Farm & Tiere            │
│ ✅ Taps & Coins            │
│ ✅ Minigames & Tickets     │
│ ✅ Marktplatz & Handel     │
│                             │
│ Das Spiel beginnt jetzt!    │
│                             │
│   [Viel Spaß! 🚀]           │
└─────────────────────────────┘
```

**Nach Klick**:
- RPC `tutorial_step(p_step=99)`
- `profiles.tutorial_completed_at := NOW()`
- Modal schließt, Spieler ist frei

---

## 🛡️ Sicherheit & Regeln

### RPC: `tutorial_step(p_step INT)`

```sql
CREATE OR REPLACE FUNCTION tutorial_step(p_step INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nur angemeldet
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Step nur voranrücken, nicht zurückgehen
  IF p_step <= (SELECT tutorial_step FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'tutorial_step_backwards_not_allowed';
  END IF;

  -- Nur gültige Steps
  IF p_step NOT IN (1, 2, 3, 4, 5, 99) THEN
    RAISE EXCEPTION 'invalid_tutorial_step';
  END IF;

  UPDATE profiles
  SET tutorial_step = p_step,
      tutorial_completed_at = CASE WHEN p_step = 99 THEN NOW() ELSE NULL END
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION tutorial_step(INT) TO authenticated;
REVOKE EXECUTE ON FUNCTION tutorial_step(INT) FROM anon, public;
```

### RPC: `grant_tutorial_animal()`

```sql
CREATE OR REPLACE FUNCTION grant_tutorial_animal()
RETURNS TABLE (animal_id UUID, species_id INT, level INT, tier INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_animal_id UUID;
BEGIN
  -- Nur wenn tutorial_step = 2
  IF (SELECT tutorial_step FROM profiles WHERE id = auth.uid()) != 2 THEN
    RAISE EXCEPTION 'tutorial_animal_already_granted';
  END IF;

  -- Tier-ID: Küken (species_id=1)
  INSERT INTO animals (user_id, species_id, level, tier, created_at)
  VALUES (auth.uid(), 1, 1, 1, NOW())
  RETURNING animals.id INTO v_animal_id;

  RETURN QUERY SELECT v_animal_id, 1::INT, 1::INT, 1::INT;
END;
$$;
```

---

## 🎨 UI-Komponenten

### `TutorialModal.vue` (Reusable)
```vue
<template>
  <Modal :visible="show" @hide="dismiss">
    <div class="tutorial-modal">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <div class="tutorial-image">
        <!-- Slot für Bilder/Animationen -->
        <slot name="image"></slot>
      </div>
      <div class="tutorial-buttons">
        <Button @click="onSkip" variant="ghost">Überspringen</Button>
        <Button @click="onContinue" class="btn-primary">
          {{ buttonText }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
defineProps({
  step: Number,
  title: String,
  description: String,
  buttonText: { default: 'Fortfahren' }
})

const emit = defineEmits(['continue', 'skip'])

function onContinue() {
  emit('continue')
}

function onSkip() {
  emit('skip')
}
</script>

<style scoped>
.tutorial-modal {
  text-align: center;
  padding: var(--space-4);
}

.tutorial-image {
  margin: var(--space-3) 0;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tutorial-buttons {
  margin-top: var(--space-3);
  display: flex;
  gap: var(--space-2);
}
</style>
```

### `TutorialOverlay.vue` (Step-Decorations)
- Nutzt `position: fixed; pointer-events: none` für Highlights
- Spotlight auf nächste UI-Element mit Puls-Animation
- Dismiss mit Tap auf "Verstanden"

---

## 🧪 Tests

### Unit Tests: `src/tutorial.test.js`
```javascript
import { describe, it, assert } from 'node:test'

describe('Tutorial Flow', () => {
  it('should increment tutorial_step only forward', () => {
    // Mock: profile with tutorial_step = 2
    // Expect: step(1) throws error
    // Expect: step(3) succeeds
  })

  it('should grant tutorial animal only once', () => {
    // Mock: grant_tutorial_animal() when step != 2
    // Expect: error "already_granted"
  })

  it('should track minigame play', () => {
    // Mock: play parkour while tutorial_step = 4
    // Expect: tutorial_minigame_played flag set
  })
})
```

### SQL Test: `src/tutorialSql.test.js`
```javascript
// Check RLS on tutorial_step read/write
// Check security_definer on RPC
// Check GRANT/REVOKE policies
```

---

## 📋 Implementation Checklist

- [ ] SQL: `ALTER TABLE profiles ADD COLUMN tutorial_step INT`
- [ ] SQL: RPC `tutorial_step(p_step)` + RPC `grant_tutorial_animal()`
- [ ] Component: `TutorialModal.vue` (reusable)
- [ ] Component: `TutorialOverlay.vue` (highlights)
- [ ] View: `/onboarding/character` (character creation)
- [ ] Router: Add `/onboarding` lazy-route (auth-required)
- [ ] GameView: Conditional tutorial overlays per step
- [ ] TradeView: Tutorial text + CTA for first trade
- [ ] Tests: `tutorial.test.js` + `tutorialSql.test.js`
- [ ] i18n: Add German/English strings to `src/i18n.js`
- [ ] Design Review: Screenshot auf figma/PR
- [ ] QA: Manual test all 5 steps

---

## 🔄 Related Specs

- `2026-10-08-spieler-erlebnis-roadmap.md` (Parent)
- `2026-10-22-daily-quests-design.md` (Follows tutorial)

---

## 📝 Anhang: Terminology

| Term | Bedeutung |
|------|-----------|
| **Küken** | Erste Tier-Spezies (species_id=1), kostenlos im Tutorial |
| **Quick-Action** | Schnell-Button für Minigames in GameView |
| **Hype-Loop** | Farm → Taps → Minigame → Coins → Marktplatz → neues Tier |

---

**Spec erstellt**: 2026-10-08  
**Autor**: Claude Haiku 4.5  
**Status**: ✏️ Review pending
