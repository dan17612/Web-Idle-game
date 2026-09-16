# Newcomer Onboarding Strategy — Zoo Empire

**Datum:** 2026-09-16  
**Ziel:** Neue Spieler elegant in das Spiel integrieren und erste 24h-Engagement maximieren.

## 🎯 Kernprinzipien

1. **Instant Gratification:** Erste Action in <30s, erste Reward in <2min
2. **Progressive Disclosure:** Features schrittweise freischalten, nicht überwältigen
3. **Narrative Kontex­t:** Jede Action hat Story (Tier kaufen = Zoo aufbauen, nicht nur "Nummer rauf")
4. **Social Proof:** Freunde/Leaderboard früh zeigen = "Andere spielen auch"
5. **Mobile First:** Touch-optimiert, kurze Sessions, offline-ready

---

## 📋 Onboarding-Funnel

### Phase 1: Willkommen & Auth (0–2 min)

**Ziel:** Account anlegen/anmelden ohne Friktion.

- ✅ Email-Auth (kein Social-Overhead)
- ✅ Inline-Registrierung auf AuthView (nicht mehrere Schritte)
- ✅ Optional: Demo-Account zum Spielen vor Anmeldung

**Was zeigen:**
- Flashy Hero: "Baue deinen eigenen Zoo auf & verdiene Coins"
- Icon-Teaser der 3 Hauptaktivitäten: Farm → Minigames → Marktplatz

---

### Phase 2: Farm-Einstieg (2–5 min)

**First Screen = GameView mit Fokus auf Tier kaufen & Tappen.**

**Progressive Freischaltung:**

| Minute | Feature | Trigger | Tooltip |
|--------|---------|---------|---------|
| 0 | Farm (1 Bauplatz) | Auto | "Tippe die Farm um Coins zu verdienen" |
| 1 | Shop (Küken kaufbar) | 1. Tap fertig | "Kauf dein erstes Tier — Hühner verdienen Coins für dich!" |
| 3 | 2. Bauplatz + Huhn | 50 Coins erreicht | "2 Tiere = doppelte Einnahmen" |
| 5 | Offline-Earnings-Info | Nach 5 min inaktiv | "Du verdienst auch offline, bis zu 8 Stunden!" |

**UX Details:**
- Farm-Glow/Animation bei neuem Slot (nicht nur statisch)
- Tier-Icon + Name deutlich größer (mobil)
- "Buy" Button ist prominentester Call-to-Action (Gold-Gradient, nie disabled)

---

### Phase 3: Minigames (5–15 min)

**Ziel:** Show-Off-Features, Quick-Win-Dopamin.

**First Minigame = Wordle** (casual, 2 min/Session):
- Nach 1. Tier gekauft freischalten
- Tutorial inline: "Rate ein Wort — verdiene 20 Coins"
- Green Feedback auf Sieg (Toast, Coin-Sparkle)

**Second Minigame = Memory** (social, 3 min/Session):
- Nach Wordle 1× gespielt freischalten
- Highlight: "Spieler #47 verdiente gerade 45 Coins!" (real Ticker)

**Nicht zu früh:**
- Parkour/Drift (komplexer, 3D)
- Boss-Fight (braucht Strategie)

---

### Phase 4: Social (10–20 min)

**Ziel:** FOMO-Schleifen starten (Andere spielen, Leaderboard).

**Leaderboard zeigen:**
- Nach 3 Minigames oder 100 Coins erreicht
- Highlight: "Du bist Platz #2347 — 1000 Coins bis Platz #100!"
- Real-Time Ticker von anderen Spielern (Coins verdient, Tiere gekauft)

**Freunde einladen (optional):**
- Nach Leaderboard
- "Schicke Coins an einen Freund" (Gameplay Differentiator)

---

### Phase 5: Long-Term Loop (Tag 1+)

Ist Phase 1–4 fertig, sollte der Spieler eine klare **Daily Routine** sehen:

```
Morgens:
1. Coins abholen vom Overnight-Farming
2. 1× Minigame spielen (2–3 min)
3. Leaderboard checken

Mittags/Abends (optional):
1. Neues Tier kaufen oder Bestand optimieren
2. Mit Freunden auf Marktplatz handeln
3. 3D-Minigame ausprobieren (Parkour/Drift)

Nächster Tag:
→ Repeat, neues Tier = neuer Progress-Bar
```

---

## 🎨 UI/UX Fokus für Neulinge

### GameView (Herzstück)

**Must-Haves:**
- **Coins-Counter:** Fett, großes numerisches Update bei jedem Tap
- **Tap-Zone:** 60% der Bildschirmfläche für Tier-Taps
- **Shop-Button:** Immer sichtbar (Bottom-Nav oder Floating-Action)
- **Nächstes Ziel:** "Noch 50 Coins bis Huhn" — sichtbarer Progress-Bar

### Shop-Einstieg

**Zeige erst 3 Tier:**
1. Aktuell gekauftes Tier (Gebäude-Icon = "Du besitzt dieses")
2. Nächst-billiges unbekanntes Tier (Locked-Icon)
3. 1 Premium-Tier far away (Aspirational = "Ziel für später")

**Nicht:** Alle 10 Tiere auf einmal (Entscheidungs-Überlastung).

### Tooltip-Strategy

- **Erste 5 min:** Aggressive Tooltips (fast bei jedem Click)
- **Nach 5 min:** Nur bei neuen Features (Smart Hints)
- **Toggle:** "Hilfe" im Settings zum Ein/Ausschalten

---

## 📊 Metriken zum Tracken

### Day 0 (Install-Tag)

- ✅ Sign-Up → First Tap: <2 min
- ✅ First Tap → First Shop-Open: <5 min
- ✅ First Shop → First Animal-Purchase: <10 min
- ✅ First Purchase → Minigame-Start: <15 min

**Target:** 60% sollten alle 4 Meilensteine in <20 min erreichen.

### Day 1+

- ✅ Daily Active Users (DAU)
- ✅ Average Session Length (Ziel: 5–10 min)
- ✅ Minigames-per-Player-per-Day (Ziel: 1–2)
- ✅ Animals-per-Player (Ziel: Avg. 3 nach Woche 1)

### Churn (Risk-Indicator)

- 🔴 Spieler der 0 Tiere nach 10 min kaufen → likely churn
- 🔴 Spieler die Minigame nicht versuchen nach 15 min → likely churn
- 🟡 Session <30 sec → re-engage mit Notif (optional)

---

## 🚀 Implementation-Roadmap

### Sprint 1: Kern-Onboarding

- [ ] Progressive Feature-Unlock im GameView (basierend auf Zeit/Coins)
- [ ] Tooltip-System: Aktiv in Phase 1–3, dann opt-in
- [ ] Leaderboard Real-Time Ticker (mindestens 5 Live-Events)

### Sprint 2: Social Hooks

- [ ] Freunde-Einladung mit Link/Share
- [ ] Coin-Sende-Tutorial in Phase 4
- [ ] Presence in World zeigen (soziale Proof)

### Sprint 3: Analytics & Retention

- [ ] Funnel-Tracking (s.o. Metriken)
- [ ] Push-Notifs für Churn-Risk (z. B. "Du schuldest Coins verdient — spiel jetzt!")
- [ ] A/B Test: Shop-Sorting (Billigst zuerst vs. Recommended)

---

## 🎮 Pro-Tipps für Dev

1. **Erst-Sessions sind kostbar:** Nicht spammen mit Modals/Interrupts
2. **Ladezeiten:** Jede Sekunde Verzögerung = 5% mehr Churn (First Minigame muss instant sein)
3. **Mobile-Testing:** Thumbs-Größe beachten (Buttons ≥48px)
4. **Offline-Experience:** Nach App-Start müssen Coins sichtbar sein (auch ohne Internet-Sync)
5. **Error-Handling:** "Netzwerkfehler" nicht als Red-Alert, sondern retry-freundlich

---

## Siehe auch

- `docs/superpowers/strategy/2026-09-16-player-retention.md` — Wie man bestehende Spieler hält
- `docs/superpowers/specs/` — Feature-Details (Wordle, Memory, Parkour, …)
