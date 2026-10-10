# Newcomer Tutorial Design: Erste Stunde optimieren
**2026-10-10** | Interaktives 3-Modul-System für bessere Early Retention

## Ziel

Neue Spieler in der **ersten Stunde** drei Kern-Konzepte lernen:
1. Tiere kaufen & sammeln
2. Minispiele spielen → Coins verdienen
3. Tier ausrüsten & Boni

Ohne Hürden, ohne Skip-Zwang, nur Hints. Nach Abschluss: automatisches Rätsel-UI,
das die nächsten 3 Tage sanfte Hinweise gibt.

---

## 1. Tutorial Module (0–10 Min)

### Modul 1: "Tiere sammeln" (~2 Min)

**Trigger:** Erste Anmeldung, `game.tutorial.step === 0`

**Ablauf:**

1. **GameView rendered** → Overlay-Vorhang dunkelgrau (`rgba(0,0,0,0.6)`)
2. **Toast oben:** „Willkommen in Zoo Empire! 🦁"
3. **Spotlight:** Shop-Knopf wird weiß durchleuchtet
4. **Sprechblase (Info-Box):**
   ```
   "Tippe hier, um Tiere zu kaufen!
   Mehr Tiere = mehr Coins verdienen 💰"
   
   [Schließen] oder [Skip Tutorial]
   ```
5. **Spieler tippt Shop-Knopf** → weiterleitung zu ShopView
6. **ShopView Auto-Highlight:** Erstes Tier (z. B. Löwe, kostenlos oder 100 Coins)
   wird hervorgehoben
7. **Toast:** "Tippe auf ein Tier zum Kaufen!"
8. **Spieler kauft Tier** → RPC erfolgt → zurück zu GameView
9. **Modul 1 Complete:** Flag `tutorial.step = 1` speichern

**Implementierung:**

```javascript
// stores/game.js oder neue stores/tutorial.js
const tutorialState = reactive({
  step: 0, // 0: animals, 1: minigame, 2: equip, 3: done
  dismissed: false,
  completedAt: null,
  hints_shown: [], // für Analytics
});

// in GameView.vue
const spotlight = ref(null); // DOM-Element des Shop-Btns
const tutorialActive = computed(() => !tutorialState.dismissed && tutorialState.step < 3);
```

**UI-Komponente: `TutorialOverlay.vue`**

```vue
<template>
  <Teleport to="body" v-if="active">
    <!-- Dunkelgrauer Vorhang mit Spotlight -->
    <div class="tutorial-overlay" :style="overlayStyle">
      <!-- Spotlight: Kreisausschnitt um Ziel-Element -->
      <div class="tutorial-spotlight" :style="spotlightStyle"></div>
    </div>
    
    <!-- Sprechblase -->
    <div class="tutorial-balloon" :style="balloonStyle">
      <div class="tutorial-text">{{ currentMessage }}</div>
      <div class="tutorial-actions">
        <Button label="Schließen" class="btn secondary" @click="next" />
        <Button label="Skip" class="btn-ghost" @click="skip" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useTutorial } from '@/composables/useTutorial';

const { tutorialState, nextStep, skipTutorial } = useTutorial();
const spotlight = ref(null);

const messages = [
  "Willkommen in Zoo Empire! 🦁\nTippe hier, um Tiere zu kaufen!\nMehr Tiere = mehr Coins verdienen 💰",
  "Großartig! Jetzt spiele ein Minigame.\nTippe hier, um Coins zu verdienen!\nVersuche Parkour, Drift oder BlockFall.",
  "Perfekt! Tiere mit Ausrüstung verdienen mehr.\nTippe hier, um Ausrüstung anzulegen!",
];

const currentMessage = computed(() => messages[tutorialState.step]);

const active = computed(() => !tutorialState.dismissed && tutorialState.step < 3);

const spotlightStyle = computed(() => {
  // Berechne Position des Ziel-Elements (z. B. Shop-Btn, Parkour-Card)
  // Highlight via CSS mask oder SVG cutout
  return {
    '--spotlight-x': '50px',
    '--spotlight-y': '200px',
  };
});

const balloonStyle = computed(() => ({
  top: '320px',
  left: '50%',
  transform: 'translateX(-50%)',
}));
</script>

<style scoped>
.tutorial-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1050; /* über Modalen, unter Tutorial-UI */
  pointer-events: none;
}

.tutorial-spotlight {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

.tutorial-balloon {
  position: fixed;
  width: 80vw;
  max-width: 300px;
  background: var(--card);
  border: 3px solid var(--accent);
  border-radius: var(--radius);
  padding: var(--space-3);
  z-index: 1051;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tutorial-text {
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: var(--space-2);
  font-weight: 500;
}

.tutorial-actions {
  display: flex;
  gap: var(--space-1);
  justify-content: center;
}
</style>
```

---

### Modul 2: "Minigame spielen" (~3 Min)

**Trigger:** Nach Abschluss von Modul 1

**Ablauf:**

1. **GameView:** Neuer Spotlight auf Parkour-Quick-Action (`.qa-btn`)
2. **Sprechblase:**
   ```
   "Super! Jetzt spiele ein Minigame.
   Tippe hier, um Coins zu verdienen!
   
   Versuche: Parkour, Drift oder BlockFall 🎮"
   ```
3. **Spieler wählt Minigame** (beliebig, nicht verpflichtend Park)
4. **Minigame-View:** Auto-Start Level 1 (keine Überschrift, direkt spielen)
5. **Nach Level-Completion:**
   - Toast: "🎉 Du hast Coins verdient!"
   - Coins anzeigen: "+500 Coins"
   - Flag: `tutorial.step = 2`
6. **Automatisch zurück zu GameView** (oder kleiner Zurück-Btn)

**Spezial:** Zeitlimit lockern für Anfänger
- Level 1 hat keine Zeitlimit-Strafe
- Coins auch bei "Fehler"-Abschluss gutgeschrieben

---

### Modul 3: "Tier ausrüsten" (~2 Min)

**Trigger:** Nach Abschluss von Modul 2

**Ablauf:**

1. **GameView:** Spotlight auf Inventory-Btn
2. **Sprechblase:**
   ```
   "Tiere mit Ausrüstung verdienen 20% mehr!
   Tippe hier → wähle dein Tier → lege Rüstung an 🛡️"
   ```
3. **Spieler öffnet Inventory** → wählt das gekaufte Tier
4. **Tier-Detail:** Auto-Highlight auf Rüstungs-Slot
   - Sprechblase: "Tippe hier → Rüstung anschauen"
5. **Spieler öffnet Ausrüstungs-Auswahl** → wählt erste verfügbare Rüstung
6. **Equip erfolgt** → Toast: "✨ Tier ausgerüstet! +20% Bonusverdienst"
7. **Tutorial komplett:** `tutorial.step = 3`, `tutorial.completedAt = now()`

---

## 2. Post-Tutorial: Rätsel-System (3 Tage)

Nach Modul 3 → **Hint-Rätsel**, die täglich einen Tipp geben, ohne zu zwingen.

**UI:** Kleines Gold-Abzeichen oben rechts in Coins-Anzeige ("💡"), bei Klick
öffnet sich Modal:

```
Heute (Tag 1): "Versuchst du schon Zucht? → Gehe zu Inventar → Tier auswählen"
Morgen (Tag 2): "Markt öffnet neue Welten. → Gehe zu Trade → Market"
Tag 3: "Leaderboards zeigen deinen Fortschritt. → Sieh dir Top 10 an"
```

**Implementierung:**

```javascript
// composables/useTutorialHints.js
export function useTutorialHints() {
  const hints = [
    { day: 1, icon: '🐣', text: 'Versuche Zucht!' },
    { day: 2, icon: '💰', text: 'Markt erkunden' },
    { day: 3, icon: '🏆', text: 'Leaderboards ansehen' },
  ];
  
  const today = Math.floor((Date.now() - tutorial.completedAt) / (24*3600*1000));
  return hints.filter(h => h.day <= today && h.day <= 3);
}
```

---

## 3. DB-Schema

```sql
-- Neue Tabelle für Tutorial-Fortschritt
create table tutorial_progress (
  user_id uuid primary key references auth.users,
  step int default 0, -- 0: animals, 1: minigame, 2: equip, 3: done
  dismissed boolean default false,
  completed_at timestamp,
  hints_shown jsonb default '[]', -- [0, 1, 2] = welche Hints gezeigt
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS: nur SELECT + UPDATE für self
alter table tutorial_progress enable row level security;

create policy "User kann nur eigene Tutorial sehen"
  on tutorial_progress for select
  using (auth.uid() = user_id);

create policy "User kann nur eigene Tutorial updaten"
  on tutorial_progress for update
  using (auth.uid() = user_id);

-- RPC zum Fortschritt speichern
create or replace function complete_tutorial_step(p_step int)
returns jsonb language plpgsql security definer as $$
begin
  update tutorial_progress
  set step = p_step,
      completed_at = case when p_step = 3 then now() else completed_at end,
      updated_at = now()
  where user_id = auth.uid();
  
  return json_build_object('step', p_step, 'success', true);
end; $$;
```

---

## 4. Composable: `useTutorial.js`

```javascript
import { ref, computed } from 'vue';
import { useGame } from '@/stores/game';
import { useAppToast } from '@/composables/useAppToast';

export function useTutorial() {
  const game = useGame();
  const toast = useAppToast();
  
  const tutorialState = ref({
    step: 0,
    dismissed: false,
    completedAt: null,
  });
  
  const nextStep = async () => {
    const newStep = tutorialState.value.step + 1;
    const { data } = await supabase.rpc('complete_tutorial_step', { p_step: newStep });
    
    if (data) {
      tutorialState.value.step = newStep;
      if (newStep === 3) {
        tutorialState.value.completedAt = new Date();
        toast.ok('🎉 Tutorial abgeschlossen!');
      }
    }
  };
  
  const skipTutorial = async () => {
    // Markiere als dismissed, aber nicht als completed
    tutorialState.value.dismissed = true;
    // Optional: speichere, dass übersprungen wurde (für Analytics)
  };
  
  return { tutorialState, nextStep, skipTutorial };
}
```

---

## 5. Test-Szenarien

- [ ] Tutorial startet automatisch nach Auth
- [ ] Spotlight folgt Ziel-Element (responsive)
- [ ] Modul 1: Shop-Btn wird hervorgehoben, Spieler kauft Tier
- [ ] Modul 2: Minigame Level 1 hat keine Zeitstrafe
- [ ] Modul 3: Ausrüstung wird erfolgreich angelegt
- [ ] Nach Modul 3: Hint-Rätsel zeigt sich täglich
- [ ] Skip funktioniert ohne Fehler
- [ ] Dark Mode: Sprechblase und Overlay lesbar
- [ ] Mobile: Spotlight und Balloon bleiben sichtbar (<560px)
- [ ] Re-Aufwacher (2. Session): Tutorial nicht gezeigt, Hints ja

---

## 6. Analytics & Monitoring

**Events zum Tracken:**

- `tutorial_started` — Spieler sieht Modul 1
- `tutorial_step_<n>_completed` — Modul n abgeschlossen
- `tutorial_skipped` — Spieler überspringt Manual
- `hint_<day>_shown` — Hint an Tag n angezeigt
- `hint_<day>_clicked` — Spieler tippt auf Hint

**Metriken:**

- Completion Rate: `tutorial_step_3_completed / tutorial_started`
- Dropout: `tutorial_skipped / tutorial_started`
- Hint Engagement: `hint_1_clicked / hint_1_shown`

---

## 7. Deployment & Rollout

1. **QA:** Alle Szenarien lokal testen (siehe Punkt 5)
2. **Soft Launch:** 10 % Spieler (Feature Flag: `tutorialEnabled`)
3. **Monitor:** Analytics 24 h, ggf. Adjustments
4. **Full Rollout:** 100 %

**Rollback:** Feature Flag auf `false` setzen (keine DB-Änderungen nötig)

