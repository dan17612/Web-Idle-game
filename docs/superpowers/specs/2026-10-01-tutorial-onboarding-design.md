# Tutorial-Onboarding — Design

## Ziel

Neue Spieler sollen in **unter 15 Minuten** spielbar sein und verstehen, warum sie wiederkommen sollten. Das Tutorial ist **skipbar**, aber jeder Schritt vermittelt ein Aha-Erlebnis.

---

## Spieler-Zielgruppe

- **Alter:** 8–65, Mobile-First (Android/iOS)
- **Sprachkenntnisse:** DE/EN/RU, einfache Begriffe, Emoji-schwer
- **Geduld:** <3 Minuten pro Schritt, sonst Abbruch

---

## Tutorial-Architektur

### Phasen

| Phase | Schritte | Ziel | Dauer |
|-------|----------|------|-------|
| **Auth** | Login / Register | Account ist aktiv | 2 min |
| **Tier 1** | Erstes Tier + Tippen | Coins verdienen sichtbar machen | 3 min |
| **Idle** | Warten auf Coins | Passive Income verstehen | 5 min / offline möglich |
| **Tier 2** | Huhn kaufen | Skalierbarkeit zeigen | 2 min |
| **Wahl** | "Was ist dir wichtig?" | Freunde? Minigames? Welt? | 1 min |
| **Finish** | Erste Quest erhalten | Loop schließen | <1 min |

**Gesamtdauer:** ~8 Minuten aktivität + bis zu 5 Minuten Warten = 13 Min interaktiv/passiv

---

## Step-by-Step Sequence

### 1. **AuthView** → **Nach Login Redirect**

Nach erfolgreichem Login/Register wird der neue Spieler (Accounts < 1h alt) automatisch zu `/tutorial-step-1` geleitet.

```
GET /login
→ POST /auth/register (via Supabase)
→ Redirect to /tutorial-step-1
```

Gegencheque: `created_at` in `profiles` < 1 Stunde UND kein Feld `tutorial_completed = true`.

---

### 2. **Step 1: Willkommen & Erstes Tier**

**Route:** `/tutorial-step-1`

**Screen-Layout:**
```
┌─────────────────────────────┐
│                             │
│   Willkommen in Zoo Empire! │  ← Großtext
│                             │
│   Du wirst Tiere sammeln    │
│   und Coins verdienen.      │  ← Kontext
│                             │
│   [Überspringen]           │  ← Optional
│                             │
│        🐤 Küken             │  ← Grosses Emoji
│                             │
│   Das ist dein erstes Tier! │  ← Labeling
│   Tippe darauf, um es zu    │
│   wecken.                   │
│                             │
│      [TAP THE CHICK]        │  ← CTA
│                             │
└─────────────────────────────┘
```

**Logic:**

- **Giveway:** `await supabase.rpc('buy_animal_tutorial', { p_species: 'chicken' })` (kauft kostenlos, server-validiert)
- **Animation:** Küken-Emoji springt, Gold-Coins (+50) fallen herunter, Sound `ding.mp3`
- **Coin-Counter:** Top rechts: "50 🪙" (blinkt auf)
- **Action:** Spieler muss mindestens 3× auf das Emoji tippen → "Step Complete!" Button wird aktiv
- **Text-Update:** "Du hast 50 Coins verdient! Dein Küken verdient jetzt jede Sekunde..."

**Skip:** [Überspringen] → `tutorial_progress.step = 2`, direkt zu Step 2.

---

### 3. **Step 2: Passive Income sehen**

**Route:** `/tutorial-step-2`

**Screen-Layout:**
```
┌─────────────────────────────┐
│                             │
│  Dein Küken arbeitet! 🪙     │
│                             │
│     🐤 +0.5 / Sekunde       │
│                             │
│  In 5 Minuten hast du:      │
│  150 Coins gesammelt.       │  ← Zeige die Math
│                             │
│  Komm später wieder!        │
│  Offline verdient es weiter │  ← Hook
│                             │
│   [Weiter →]               │  ← Nach ~3 Sekunden aktiv
│                             │
└─────────────────────────────┘
```

**Logic:**

- **Counter:** Coins oben in Echtzeit inkrementieren (setInterval basierend auf `Date.now() + serverOffset`)
  ```js
  const rewardPerSec = 0.5
  const elapsedMs = Date.now() - stepStartTime
  coins = 50 + Math.floor(elapsedMs / 1000 * rewardPerSec)
  ```
- **Passivity-Messaging:** "Das passiert im Hintergrund — selbst wenn du die App schließt!"
- **Time-Gating:** Button wird nach 3 Sekunden aktiv (verhindert Spammen)
- **Audio:** Optional leises Coin-Jingle alle 5 Sekunden

---

### 4. **Step 3: Zweites Tier freischalten**

**Route:** `/tutorial-step-3`

**Anforderung:** Coins haben sich auf 50+ erhöht (automatisch durch Step 2-Warterei).

**Screen-Layout:**
```
┌─────────────────────────────┐
│                             │
│  Du hast 150+ Coins! 💪     │
│  (aktueller Counter)        │
│                             │
│  Kaufe ein Huhn.            │
│  Es verdient 2 / Sekunde.   │  ← Spannung: 4× schneller!
│                             │
│    🐔 Huhn — 250 🪙         │
│                             │
│  Mit Huhn + Küken:          │
│  +2.5 🪙 / Sekunde         │  ← Macht es klar
│                             │
│      [KAUFE HUHN]          │  ← CTA
│                             │
│   [Ich will warten]        │  ← Skip option (aber nicht stark prominent)
│                             │
└─────────────────────────────┘
```

**Logic:**

- **Precondition Check:** Server verbirgt Step 3 Button bis `player.coins >= 250` (oder gibt 250 kostenlos)
- **Purchase RPC:** `await supabase.rpc('buy_animal_tutorial', { p_species: 'rabbit' })`
  - Gibt Huhn (nicht Hase!) mit cost 250
  - Server dedukt Coins
  - Client: `coins -= 250` + Happy-Animation
- **Combo-Feedback:** "Jetzt verdienst du 2.5 Coins/Sec! 🎉"
- **Weiter-Button:** Aktiv nach Kauf

**Alternative (wenn Spieler warten will):** Button "Ich warte" → zurück zu Step 2, Coins-Counter läuft weiter bis 250.

---

### 5. **Step 4: Wahl des Abenteuers**

**Route:** `/tutorial-step-4`

**Screen-Layout:**
```
┌─────────────────────────────┐
│                             │
│ Wie willst du spielen? 🎮   │
│                             │
│  ┌──────────────────────┐  │
│  │ 👥 Mit Freunden     │  │
│  │ Freunde einladen,   │  │
│  │ handeln, Markt.     │  │
│  └──────────────────────┘  │
│                             │
│  ┌──────────────────────┐  │
│  │ 🎯 Minigames        │  │
│  │ Parkour, Memory,    │  │
│  │ Wordle, Blockfall.  │  │
│  └──────────────────────┘  │
│                             │
│  ┌──────────────────────┐  │
│  │ 🌍 Erkunde die Welt │  │
│  │ Baue deine Farm,    │  │
│  │ Tiere ausstaffieren.│  │
│  └──────────────────────┘  │
│                             │
│ [Überspringen]            │
│                             │
└─────────────────────────────┘
```

**Logic:**

- **Three Paths:**
  1. **Freunde** → Redirect zu `/friends` mit Anleitung
  2. **Minigames** → Redirect zu `/parkour` (einfachstes Spiel) mit Demo
  3. **Welt** → Redirect zu `/world` mit Joystick-Tutorial
- **Tracking:** `tutorial_progress.path = 'friends' | 'minigames' | 'world'`
- **Rückkehr:** Nach dem Pfad auto-Redirect zu Step 5 (oder beim Zurück)
- **Skip:** "Überspringen" → direkt zu Step 5

---

### 6. **Step 5: Erste Quest & Finish**

**Route:** `/tutorial-step-5` oder Redirect nach Step 4-Path

**Screen-Layout:**
```
┌─────────────────────────────┐
│                             │
│ Glückwunsch! 🎉            │
│ Tutorial abgeschlossen.     │
│                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━ │
│                             │
│ Deine erste Quest:          │
│                             │
│ 📝 Sammle 1000 Coins       │
│    Fortschritt: 245/1000   │
│    Belohnung: 5000 Coins   │
│                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━ │
│                             │
│ Wichtig: Komm morgen zurück!│
│ Notifications helfen dir.   │
│                             │
│ [Zukunft erkunden] → /     │
│                             │
└─────────────────────────────┘
```

**Logic:**

- **Flag:** Setze `profiles.tutorial_completed = true`
- **First Daily Quest:** Gebe eine Quest zum Verdienen (1000 Coins, leicht zu schaffen in 1–2 Tagen)
- **Notifications:** Frage um Permission, erkläre Benefits
- **Redirect:** Nach 3 Sekunden auto-close zu `/` (GameView) oder Manual [Zur Farm]

---

## Database Schema

### Neue Tabelle: `tutorial_progress`

```sql
CREATE TABLE IF NOT EXISTS tutorial_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  step INT DEFAULT 1,
  path TEXT, -- 'friends' | 'minigames' | 'world' | NULL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tutorial"
  ON tutorial_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "insert_own_tutorial"
  ON tutorial_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_tutorial"
  ON tutorial_progress FOR UPDATE
  USING (user_id = auth.uid());
```

### Migration

Datei: `supabase/migrations/20261001_tutorial_progress.sql`

---

## RPCs (neu)

### `buy_animal_tutorial(p_species TEXT)`

```sql
CREATE OR REPLACE FUNCTION buy_animal_tutorial(p_species TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost INT;
  v_user_id UUID;
  v_is_new BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Nur in der Tutorial-Phase
  SELECT (NOW() - created_at < INTERVAL '1 hour') INTO v_is_new
  FROM profiles WHERE id = v_user_id;

  IF NOT v_is_new THEN
    RAISE EXCEPTION 'Tutorial only available for new players';
  END IF;

  -- Kosten aus species_costs
  SELECT cost INTO v_cost
  FROM species_costs
  WHERE species = p_species AND enabled = true;

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Species not found or disabled';
  END IF;

  -- Tutorial-Rabatt: Erstes Tier kostenlos, danach 50%
  IF (SELECT COUNT(*) FROM animals WHERE owner = v_user_id) = 0 THEN
    v_cost := 0;
  ELSE
    v_cost := v_cost / 2;
  END IF;

  -- Kauf (wie buy_animal)
  UPDATE profiles
  SET coins = coins - v_cost
  WHERE id = v_user_id AND coins >= v_cost;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  -- Tier einfügen
  INSERT INTO animals (owner, species)
  VALUES (v_user_id, p_species);

  RETURN jsonb_build_object(
    'success', true,
    'coins', (SELECT coins FROM profiles WHERE id = v_user_id),
    'server_now', NOW()
  );
END;
$$;
```

### `mark_tutorial_step(p_step INT, p_path TEXT DEFAULT NULL)`

```sql
CREATE OR REPLACE FUNCTION mark_tutorial_step(p_step INT, p_path TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tutorial_progress (user_id, step, path)
  VALUES (auth.uid(), p_step, p_path)
  ON CONFLICT (user_id) DO UPDATE
  SET step = p_step, path = COALESCE(p_path, tutorial_progress.path);

  IF p_step >= 5 THEN
    UPDATE profiles
    SET tutorial_completed = true
    WHERE id = auth.uid();
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
```

---

## Frontend-Komponenten

### `TutorialOverlay.vue`

Wrapper um alle Tutorial-Steps. Zeigt/blendet ein `<div class="tutorial-container">` mit absoluter Positionierung über dem Game-Content.

```vue
<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const step = ref(1)
const path = ref(null)
const isSkipped = ref(false)

const canSkip = computed(() => step.value <= 4)

// Bei Komponenten-Mount laden wir aus Supabase
onMounted(async () => {
  if (!auth.isAuth || auth.profile?.tutorial_completed) {
    isSkipped.value = true
    return
  }
  // Lade tutorial_progress aus Supabase
})

const skipTutorial = async () => {
  await supabase.rpc('mark_tutorial_step', { p_step: 5 })
  router.push('/')
}

const nextStep = async () => {
  step.value++
  await supabase.rpc('mark_tutorial_step', { p_step: step.value, p_path: path.value })
  if (step.value >= 5) router.push('/')
}
</script>

<template>
  <div v-if="!isSkipped" class="tutorial-overlay">
    <component
      :is="`TutorialStep${step}`"
      :on-next="nextStep"
      :on-skip="skipTutorial"
      :can-skip="canSkip"
      @path-chosen="(p) => (path = p)"
    />
  </div>
</template>
```

---

## Routing

```js
// router.js
{
  path: '/tutorial-step-:step',
  name: 'tutorialStep',
  component: () => import('./views/TutorialView.vue'),
  meta: { auth: true }
}
```

**Oder:** Alle Steps als einzelne Routes:

```js
{ path: '/tutorial/step1', component: () => import('./views/TutorialStep1.vue') },
{ path: '/tutorial/step2', component: () => import('./views/TutorialStep2.vue') },
// ...
```

---

## Lokalisierung (i18n)

```js
// src/i18n.js
const I18N = {
  de: {
    tutorial: {
      step1: {
        title: 'Willkommen in Zoo Empire!',
        desc: 'Du wirst Tiere sammeln und Coins verdienen.',
        action: 'TIPPE AUF DAS KÜKEN'
      },
      step2: {
        title: 'Dein Küken arbeitet! 🪙',
        desc: 'In 5 Minuten hast du 150 Coins gesammelt.'
      },
      // ...
    }
  },
  en: { ... },
  ru: { ... }
}
```

---

## Test-Plan

1. **New Player Flow:** Neuer Account → Login → Tutorial-Step 1 sollte erscheinen
2. **Coin Progression:** Step 1 Tier kauf → Step 2 Counter sollte realistisch wachsen
3. **Skip-Möglichkeit:** [Überspringen] sollte jederzeit funktionieren, alle Steps überspringen
4. **Path Selection:** Step 4 Wahl speichern → Step 5 richtig routen
5. **Completion:** Tutorial-Flag setzen → `/` sollte nicht mehr zum Tutorial leiten
6. **Offline:** App schließen am Step 2 (Idle) → Später öffnen → Coins sollten aufgeholt sein

---

## Design-Prinzipien

- **Schnell:** < 15 Min bis zum freien Spielen
- **Visuell:** Emojis, Animationen, Soundeffekte
- **Lehrreich:** Jeder Schritt vermittelt ein Konzept
- **Skipbar:** Erfahrene Spieler quälen nicht
- **Mobil-First:** Touch-Large, Portrait-Only, SafeArea
- **Mehrsprachig:** Deutsch, Englisch, Russisch (echte Umlaute)

---

**Autor:** Claude  
**Datum:** 2026-09-26  
**Status:** Ready for Implementation  
