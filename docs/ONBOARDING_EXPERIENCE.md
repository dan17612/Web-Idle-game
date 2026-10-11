# 🎮 Zoo Empire — Onboarding & New Player Experience

Dieses Dokument beschreibt die Onboarding-Strategie und wie wir neue Spieler so schnell wie möglich in den Flow bringen.

## Ziele des Onboarding

### Für neue Spieler:
- ✅ **Schnell Erfolg erleben** — in den ersten 2 Minuten erste Münzen verdienen
- ✅ **Kernmechanik verstehen** — „Tiere kaufen = Passiv Geld verdienen"
- ✅ **First Win** — erstes Tier kaufen und sehen, dass es funktioniert
- ✅ **Fühlen dass es vorangeht** — Progression ist sichtbar & schnell

### Für das Spiel:
- 📊 Neue Spieler halten (Retention Day 1)
- 🎯 Verständnis für alle Spielmodi (Farm, Minispiele, Marktplatz, Welt)
- 💰 Frühe Monetarisierungsmöglichkeiten (optional Cosmetics)
- 👥 Community-Gefühl aufbauen

---

## 🚀 Der ideale First-Time-User-Flow

### Minute 0–2: Login & Farm-Intro
```
[Login] 
  ↓
[Farm-Screen öffnet mit deinem ersten Küken]
  ↓
[Tutorial-Toast: „Dein Küken verdient Münzen! Tippe zur Bonus +10%"]
  ↓
[Spieler tippt Farm → sieht +10 Münzen floating oben]
  ↓
[Erfolg! Spieler ist gehookt]
```

**Was passiert hier?**
- Login ist schnell (keine Validierung der Email nötig)
- Farm ist **sofort spielbar** — keine langen Intros
- Feedback ist **visuell & belohnend** (Münz-Animation)
- **Aha-Moment:** „Ich kann Geld verdienen!"

### Minute 2–5: Erstes Tier kaufen
```
[Spieler hat jetzt ~50 Münzen von Tap-Bonus]
  ↓
[Hero-Button: „Neue Farm-Platzierung freischalten? 🐓"]
  ↓
[Spieler drückt → Huhn für 250 Münzen wird angeboten]
  ↓
[Toast: „Arbeitet dein Huhn? Beobachte die Münzen wachsen 👀"]
  ↓
[Spieler schaut eine Sekunde zu → FLOW startet]
```

**Psychologie:**
- Spieler sind **jetzt Investor** (nicht nur Tap-Süchtig)
- Sehen **passive Progression** — auch ohne zu spielen geht es voran
- **Natürliche Neugier:** „Was wird das nächste Tier?"

### Minute 5–10: Feature-Entdeckung
```
[Navigation zeigt alle Tabs: Farm | Shop | Minispiele | Marktplatz | Welt]
  ↓
[Quick-Start-Cards zeigen:]
  • 🏃 „Parkour spielen → +100k Münzen"
  • 🧠 „Wordle spielen → +10k Münzen"
  • 🌍 „Zoo-Welt besuchen → andere Spieler treffen"
  • 💬 „Marktplatz → mit anderen handeln"
  ↓
[Spieler klickt auf das, das sie interessiert]
```

**Design-Prinzip:** Nicht alles aufzwingen, aber **Optionen zeigen** — jeder Spieler-Typ (Chill, Aktiv, Social) findet seinen Platz.

---

## 📋 Onboarding-Checkliste für neue Spieler (In-App)

Die App sollte eine **leichte Checklist zeigen** (localStorage), um neue Spieler zu leiten:

```
✅ Login erfolgreich
✅ Dein erstes Tier (Küken) verdient Münzen
✅ Tap-Bonus nutzen (Tier antippen)
✅ Dein 2. Tier kaufen (Huhn)
✅ Offline-Verdienste verursachen (app schließen & später reinkommen)
✅ Ein Minispiel versuchen (Parkour/Wordle)
⬜ Zoo-Welt besuchen (andere Spieler treffen)
⬜ Marktplatz nutzen (ein Tier handeln)
⬜ 1 Million Münzen verdienen
```

**Verhalten:**
- Diese Checklist ist **optional & motivierend** — nicht nervig
- **Verschwindet nach 3 Tagen** oder wenn alles erledigt (oder Spieler deaktiviert sie)
- Gibt **kleine Rewards** bei Milestones (z. B. „Gratulieren! Dein 2. Tier wartet")
- Mobile: Unten als Scrollable Sheet, Desktop: Seitenleiste

---

## 🎯 Kritische Onboarding-Momente

### Moment 1: Login → Farm (Make or Break)
- **Problem:** Leerer Screen, Long Loading
- **Lösung:** 
  - Schneller Login (kein Email-Verify für Dev/Early Access)
  - Farm-Preview während Loading
  - Sofortige Interaktion möglich (antippen)

### Moment 2: Erstes Tier kaufen (Commitment)
- **Problem:** Spieler trauen sich nicht, Münzen auszugeben
- **Lösung:**
  - **Gratis-Demo:** Zeige wie Huhn Münzen verdient (virtuell) → dann kaufe
  - **Ermutigung:** Toast „Das Huhn verdient sich selbst zurück in 2 Minuten!"
  - **Guarantee:** Tier-Rückkauf möglich? (Vertrauensboost)

### Moment 3: Offline-Verdienste (Aha-Moment)
- **Problem:** Spieler vergessen, dass die App im Hintergrund verdient
- **Lösung:**
  - **Explizit erklären:** „Schließ die App → wir verdienen für dich"
  - **Push-Notification:** „Hallo! Deine Farm hat 50M Münzen verdient. Komm rein!"
  - **First Offline Reward:** Extra Bonus die erste Nacht

### Moment 4: Feature-Überwhelm (FOMO)
- **Problem:** Zu viele Optionen (Shop, Minispiele, Welt, Marktplatz) verwirren
- **Lösung:**
  - **Linear einführen:** Tag 1 = Farm, Tag 2 = Shop, Tag 3 = Minispiele
  - **Soft Launch:** Tabs sind sichtbar, aber mit Hinweis „Komm bald zurück!"
  - **Quick-Start Cards:** Hero-Buttons der empfohlenen nächsten Aktionen

---

## 🎨 UI/UX Onboarding-Patterns

### Toast-Serie (die ersten 10 Minuten)
```
🎮 "Willkommen! Dein Küken wartet..."
💡 "Tippe die Farm für +10% Bonus!"
🎯 "Sag mir, wenn du 50 Münzen hast..."
🎁 "+250 Münzen? Kaufe ein Huhn und verdiene passiv!"
🚀 "Dein Huhn arbeitet jetzt. Komm in 5 Min zurück!"
```

Jeder Toast ist **actionable** & **kurz** (<10 Worte).

### Guided Tour (Optional)
- **Animation:** Pfeile zeigen auf wichtige Buttons
- **Timing:** Nur in kritischen Momenten, nicht nervig
- **Skip:** Immer möglich
- **Auto-Advance:** Nach Aktion weiter (nicht auf Klick warten)

Beispiel:
```
[Pfeil zeigt auf Shop-Tab]
"Hier kannst du neue Tiere kaufen. Probier's!"
→ Spieler klickt Shop → nächster Hinweis
```

### Glossar (Help Icon)
```
❓ Schwierige Begriffe haben kleine Help-Icons
  • Offline-Verdienste
  • Tap-Bonus
  • Minispiele
  • Marktplatz

→ Popup erklärt in 1 Satz
```

---

## 📊 Erfolgreiche Onboarding-Metriken

### Für Product:
- **D1 Retention:** 70%+ Spieler kommen Tag 2 zurück
- **D7 Retention:** 40%+ spielen nach einer Woche
- **Tutorial Completion:** 80%+ komplettieren Checkliste
- **First Purchase:** X% versuchen Shop in den ersten 5 Min

### Für Engagement:
- **Feature Discovery:** Wie viele Spieler finden alle Modi?
- **Minispiel-Adoption:** Wie viele probieren Parkour/Wordle?
- **Zoo-Welt:** Wie viele besuchen die 3D-Welt?
- **Marktplatz:** Wie viele machen den ersten Trade?

### Für Retention:
- **Session Length:** Durchschnittlich 8+ Min pro Session (gutes Zeichen)
- **Return Frequency:** 50%+ täglich aktiv (ideal für Idle-Game)
- **Monetization:** Optional Cosmetics werden von 10%+ gekauft

---

## 🔄 Langfristige Onboarding (Weeks 1–4)

Neuer ist nicht nur die erste Sitzung — es ist die erste Woche!

### Woche 1: Foundations
- Farm läuft (Offline-Verdienste Routine)
- Minspiele getestet
- Erste 1M Münzen verdient
- Marktplatz Grundlagen verstanden

### Woche 2: Progression
- Tier-Upgrades erreichen (10+ Tiere)
- Zoo-Welt besucht, andere Spieler gesehen
- Leaderboard checken („Wo bin ich?")
- Push-Notifs aktiviert

### Woche 3: Community
- Erstes Trade gemacht
- Freund eingeladen / auf Leaderboard gesehen
- Minispiel-Lieblings-Genre gefunden
- Farm optimiert

### Woche 4: Veteran
- Langfristige Ziele setzen (10B Münzen? Top 10 Leaderboard?)
- Farm-Design in Zoo-Welt kustomisieren
- Regelmäßige Spieler (mindestens 3× Woche)

---

## ⚠️ Anfängerfehler vermeiden

### Fehlende Klarheit
```
❌ Spieler versteht nicht, dass Tiere PASSIV Geld verdienen
✅ Lösung: Explizit sagen "Du musst nichts tun. Die verdienen für dich!"
```

### Zu viel auf einmal
```
❌ Alle Features gleichzeitig aktiviert → Überwhelm
✅ Lösung: Features progressiv freischalten (auch visuell: "Coming Soon")
```

### Kein Early Win
```
❌ Spieler braucht 10 Min um erstes Erfolgs-Erlebnis zu haben
✅ Lösung: In den ersten 2 Min sollte erste Belohnung sichtbar sein
```

### Fehlende Belohnungen
```
❌ Offline-Verdienste sind unsichtbar ("Ich verdiene ja eh")
✅ Lösung: Toast wenn App geöffnet "Du hast 50M verdient! 🎉"
```

### Verwirrte Motivation
```
❌ Spieler weiß nicht, warum sie nächstes Tier kaufen sollen
✅ Lösung: Klar zeigen: "Huhn verdient 4× mehr pro Sekunde als Küken"
```

---

## 🎯 Nächste Schritte (PRs/Features)

Für Developers/Designer:

- [ ] **PR: Onboarding Checkliste UI** — In-App Intro Cards + Progress Tracking
- [ ] **PR: Guided Tour (Optional)** — Pfeile & Tooltips für erste 10 Min
- [ ] **PR: Tutorial Toasts** — Dynamische Messages basierend auf Spieler-Fortschritt
- [ ] **PR: First Offline Reward Celebration** — Spezieller Toast wenn erste Offline-Earnings gesammelt
- [ ] **PR: Help Glossar** — Help Icons für Fachbegriffe
- [ ] **Analytics Setup** — Tracking von D1, D7 Retention & Feature Discovery

---

## 📖 Siehe auch
- `PLAYER_GUIDE.md` — Vollständiger Spieler-Guide
- `PROGRESSION_ROADMAP.md` — Langfristige Ziele & Strategie
- `docs/superpowers/` — Feature-Spezifikationen
