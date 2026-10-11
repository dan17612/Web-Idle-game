# Enhanced Onboarding — Design

## Ziel

Neue Spieler laufen heute direkt ins Spiel ohne Einführung. Das führt zu:
- Überwältigung durch 12+ Minispiele und 10 Tierarten
- Kein Verständnis für Wirtschaft (Coins vs. Tickets vs. Taps)
- Zu schnelle Abgänge

Onboarding soll klare **Schritte** und **Erfolgserlebnisse** bieten:

1. Name + Avatar-Wahl (2 min)
2. Erstes Tier kaufen & füttern (3 min) → erstes Einkommen
3. Minispiele entdecken (zeitgesteuert, 1–2 pro Woche)
4. Freunde finden (optional, spät)

## Phasen

### Phase 1: Onboarding Modal (nach Login)

Reihum, 4 Dialoge (je ~30 Sekunden):

1. **Welcome** — "Willkommen! Du leitest einen Zoo mit…"
   - Bild/Animation
   - `→ Weiter`

2. **Economy Crash-Kurs** — "Es gibt zwei Währungen…"
   - Coins (von Tieren) 🪙
   - Tickets (aus Minispielen) 🎫
   - → `Verstanden`

3. **First Animal** — "Lass dein erstes Tier wählen"
   - 3 Vorschläge (Küken [50], Huhn [250], Hase [1200])
   - Text: "Küken sind kostenlos und geben dir …"
   - `✓ Auswählen` kauft das Tier direkt

4. **First Tap** — "Jetzt tippe auf deinen Zoo, um Münzen zu sammeln"
   - Tier ist platziert und animiert
   - `→ TAP!` macht einen automatischen Tap und sichert das Gefühl
   - Ergebnis: "+47 🪙" auf dem Bildschirm

Nach Phase 4 zurück zu GameView, kein Overlay mehr.

### Phase 2: Feature Rollout (nächste 2 Wochen)

Ein globales JSON (`onboarding_state` im `profiles`):

```sql
onboarding_state: {
  phase: 'complete' | 'phase_1' | 'phase_2',
  completed_at: '2026-09-22T...',
  features_unlocked: ['minigames', 'shop', 'world', ...],
  next_unlock_at: '2026-09-29T...'
}
```

**Tag 0 (Login):** Alle Basis-Features sichtbar, aber:
- Minispiele-Karten zeigen "🔒 Verfügbar ab Tag 3"
- Welt-Karte zeigt "🔒 Verfügbar ab Tag 7"

**Tag 3:** Minispiel #1 schaltet frei → Toast "🎮 Memory freigeschalten!"

**Tag 7:** Welt + Freunde schalten frei

**Tag 14:** Alles verfügbar

Das macht Neulinge vertraut mit dem Basis-Loop, bevor sie überfordert werden.

### Phase 3: Guided Achievements (Woche 1–4)

Nicht im leaderboard, nur für Neulinge sichtbar (unter 100 Coins oder erste Woche).

```
☑ Erstes Tier kaufen (+20 Coins Bonus)
☑ 1.000 Münzen verdienen (+50 Coins Bonus)
☑ Memory spielen (+20 Tickets Bonus)
☑ Einen Freund finden / einladen
```

Jedes wird als Toast gehypt: "🎉 Achievement: Erstes Tier!"

## Implementierung

### Store (`src/stores/game.js`)

Neue Getter:
- `onboardingPhase()` → read from `profiles.onboarding_state`
- `onboardingComplete()` → boolean
- `nextFeatureUnlockAt()` → Date

### Server (`Supabase`)

Migration `20260922_enhanced_onboarding.sql`:

1. Spalte `onboarding_state jsonb default '{…}' not null` zu `profiles`
2. Trigger `after insert on auth.users` → initialize mit Phase 1
3. Einmaliger Task (z. B. via Edge Function oder CLI):
   ```sql
   update profiles set onboarding_state = '{
     "phase": "complete",
     "completed_at": now()::text
   }' 
   where created_at < now() - interval '2 days';
   ```
   (alle bisherigen Spieler sind instant "fertig")

4. RPC `advance_onboarding_phase(p_next_phase text)` — nur für Client-Trigger
   (z. B. nach Freund-Hinzufügen → Phase 2 überspringen)

### Views

**GameView.vue:** Nach Login, vor allem anderen:
```js
const { showOnboarding, phase } = computed(() => ({
  showOnboarding: !game.onboardingComplete,
  phase: game.onboardingPhase
}))
```

Teleport-Overlay mit Modal-Stack (4 Dialoge nacheinander).

**Feature Rollout:** Je View (MemoryGameView, WorldView, etc.)
```js
const unlocked = computed(() => 
  game.onboardingState.features_unlocked.includes('minigames')
)
```

Statt Sidebar-Karte → Grayed-out + "🔒 Verfügbar ab {date}".

## i18n

Neue Keys in `src/i18n.js`:

```
onboarding.title
onboarding.economy.title
onboarding.economy.coins
onboarding.economy.tickets
onboarding.economy.confirm
onboarding.firstAnimal.title
onboarding.firstAnimal.hint
onboarding.firstTap.title
onboarding.firstTap.action
onboarding.firstTap.result
onboarding.featureUnlock.title
onboarding.achievement.firstAnimal
onboarding.achievement.firstCoins
onboarding.achievement.firstMinigame
…
```

Deutsche Texte mit echten Umlauten.

## Tests

| Datei | Prüft |
|---|---|
| `src/onboardingFlow.test.js` | Phase-Sequenzen, State-Übergänge |
| `src/onboardingSql.test.js` | Migration: `search_path` gepinnt, RPC-Grants nur `authenticated` |

## Nicht in dieser Spec

- **Onboarding-Analytics:** Welche Phase verlassen die meisten? (separate Instrumentation)
- **A/B-Tests:** Unterschiedliche Texte/Längen testen (separate Task)
- **Tutorial Video:** Vorerst nur Text + Bilder
