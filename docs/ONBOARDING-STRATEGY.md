# Zoo Empire — Onboarding-Strategie 2026

**Stand:** September 2026  
**Ziel:** Zoo Empire attraktiv & zugänglich für **Neulinge** machen, **Retention** für bestehende Spieler erhöhen.

---

## 📌 Schnelle Übersicht

Zoo Empire ist ein **Idle-Game** mit Tier-Sammlung, Minispielen und Multiplayer-Features. Das Problem: Neulinge sehen zu viele Funktionen auf einmal und verstehen nicht, wo sie anfangen sollen. Bestehende Spieler suchen nach Langzeitmotivation.

### Die Lösung: 3 Phasen

| Phase | Zeitrahmen | Fokus | Ziel-Metrik |
|-------|-----------|-------|------------|
| **Phase 1** | Woche 1–2 | Guided First-Time Experience | 80%+ Neulinge verstehen das Spiel in <5 Min |
| **Phase 2** | Woche 3–4 | Streak-Rewards & Weekly Challenges | 40%+ 7-Tage-Retention (vs. derzeit ~25%) |
| **Phase 3** | Woche 5–6 | Guilds, neue Leaderboards, Events | 60%+ Monthly-Aktive bleiben >1 Monat |

---

## 🎯 Phase 1: Guided Onboarding (LIVE JETZT)

**Was:** Ein interaktives **Willkommens-Modal** mit 6 Screens.

**Flow:**
1. "Welcome to Zoo Empire" — Hook
2. "Tier-Sammlung" — Game-Erklärung
3. "Kaufe dein erstes Tier" — First Action
4. "Wähle deinen Liebling" — Favorite Selection
5. "Tap-Mechanik" — Live Test
6. "Minispiele" — Feature-Teaser

**Resultat:** Neulinge wissen nach <5 Min:
- ✅ Was Zoo Empire ist
- ✅ Wie man Münzen verdient (Tappen + Minispiele)
- ✅ Was die kommenden Features sind

**Technik:**
- `GuidedOnboardingModal.vue` Komponente
- Trigger: Neulinge (< 24h alt) mit `tutorialStep = 0`
- Setzt `tutorialStep = 1` nach Abschluss

**Design-Spec:** `docs/superpowers/specs/2026-09-01-onboarding-design.md`

---

## 💪 Phase 2: Retention & Streaks (2–4 Wochen)

**Problem:** Nach 1 Woche "haben Neulinge genug Tiere gekauft" — dann fehlt die Motivation.

**Lösung:** 
1. **Streak-Rewards:** Tägliche Belohnung mit 8-Tages-Cycle (beste Rewards am Tag 8)
2. **Weekly Challenges:** Nicht-Ranglisten-Ziele (z. B. "10k Taps", "5 Minispiele", "3 Freundschaftsanfragen")
3. **"Coming Soon" Teaser:** Wenn Feature noch nicht freigegeben, zeige Countdown

**Impact:** Spieler checken täglich ein (Streak) + erledigen wöchentliche Aufgaben (Engagement).

**Technik:**
- DB: `weekly_challenges`, erweiterte `daily_rewards`
- RPC: `claim_weekly_challenge`
- GameView: Challenge-Progress-Bar

**Plan:** `docs/superpowers/plans/2026-09-01-onboarding-und-progression.md` (Phase 2 Sektion)

---

## 🌍 Phase 3: Community & Endgame (4+ Wochen)

**Problem:** Alt-Spieler sind nach Monat gelangweilt ("Gesammelt, bestanden, Top 10 vielleicht nicht möglich").

**Lösung:**
1. **Neue Leaderboards:** "Neue Spieler", "Aktivste diese Woche", "Beste Sammler"
2. **Guilds:** Spieler-Gruppen mit gemeinsamen Zielen & gemeinsamen Rewards
3. **Limited-Time Events:** Monatliche Events (z. B. "Legendary Hunt", "Boss Invasion")

**Impact:** Spieler haben unterschiedliche Wege zum Erfolg + neue Community-Wege.

**Plan:** `docs/superpowers/plans/2026-09-01-onboarding-und-progression.md` (Phase 3 Sektion)

---

## 📊 Success-Metriken

| Metrik | Ziel | Messen |
|--------|------|--------|
| **Neuling-Retention (7d)** | 40%+ | Users active_at > 7 days / created_at < 7 days |
| **First-Purchase (24h)** | 70%+ | % Neulinge, die Tier kaufen |
| **Minispiel-Adoption (48h)** | 60%+ | % Neulinge, die Minispiel probieren |
| **Daily-Active-Streak** | 50%+ | % mit Streak > 7 Tage |
| **Weekly-Challenge-Completion** | 65%+ | % die ≥1 Challenge / Woche schaffen |

---

## 📁 Dokumentation

- **Plan (Gesamt):** `docs/superpowers/plans/2026-09-01-onboarding-und-progression.md`
- **Design (Phase 1):** `docs/superpowers/specs/2026-09-01-onboarding-design.md`
- **Dieser Überblick:** `docs/ONBOARDING-STRATEGY.md`

---

## 🚀 Nächste Schritte

1. **Approval:** Team stimmt Strategie zu (Phase 1, Phase 2, Phase 3 oder Subset?)
2. **Implementation:** `feat/onboarding-phase1` Branch, erste PRs
3. **QA:** Neulinge-Flow testen, Balancing, Metriken aufsetzen
4. **Rollout:** Canary 20%, dann 100%

---

**Geplant von:** Zoo Empire Product Team  
**Letzte Aktualisierung:** 2026-09-01
