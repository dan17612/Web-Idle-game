# Zoo Empire — Nächste Schritte für Neulinge & bestehende Spieler

**Datum:** 2026-09-15  
**Ziel:** Spiel attraktiver für Anfänger und langfristig engagierend für erfahrene Spieler gestalten.

## 1. Für Neulinge (Onboarding & Early-Game-Klarheit)

### 1.1 Verbesserte Tutorial-Progression
- **Problem:** Neue Spieler sehen viele Buttons (Shop, Inventar, Freunde, Minispiele) ohne klare Reihenfolge
- **Lösung:**
  - Sequenzielles Tutorial über die ersten 5 Minuten:
    1. Willkommensgeschenk öffnen → +Taps erklären
    2. Ein erstes Tier im Shop kaufen → Tiere zeigen
    3. Erstes Minispiel starten (z. B. Drift) → Coins verdienen
    4. Tier ausrüsten → Multiplier erhöhen
  - Gated UI (Buttons grau, bis Schritt freigegeben)
  - Tooltips bei jedem "locked" Feature

### 1.2 Klare Progression-Visualisierung
- **Startseite:** Zeige einen "Fortschritts-Baum" statt reiner Kacheln
  - Tier 1: Tippen + Liebling  
  - Tier 2: Shop-Einkauf  
  - Tier 3: Erstes Minispiel  
  - Tier 4: Freunde hinzufügen / Leaderboard
- **Erklärblasen:** "Warum solltest du das tun?" bei jedem Feature

### 1.3 "Getting Started"-Sammlung
- **Neue View:** `/onboarding` mit interaktiven Schritten
- Oder Overlay-Cards in GameView, nacheinander freigegeben
- Belohnung: "Onboarding Bonus" (einmalig 2.000 🪙 bei Completion)

### 1.4 Bessere i18n für Einsteiger
- Kurze, einfache Sätze (Deutsch mit echten Umlauten ä/ö/ü)
- Beispiele statt Jargon:
  - ❌ "Multiplier-Stack aufbauen"  
  - ✅ "Wähle einen Liebling: Sein Tier gibt 2x mehr Coins pro Tap"

---

## 2. Für bestehende Spieler (Langfrist-Engagement & Progression)

### 2.1 Event-Kalender und Wiederholendes Gameplay
- **Aktueller Stand:** Memory-Event endet 2026-06-30 (vermutlich vorbei)
- **Lösung:**
  - Events mit 7-14-Tage-Zyklen planen
  - Kalender-View: Zeige kommende Events 2 Wochen im Voraus
  - Tägliche Quests pro Event:
    - Memory: "3 Levels absolvieren" → 500 Bonus-Coins
    - Parkour: "5 Stern-Runs" → +Tier
  - Zusammenstellung: Neue Events alle 2–3 Wochen (Dezember: 4, Januar: 2, usw.)

### 2.2 Langfrist-Achievements & Rangsystem
- **Achievements (neue Tabelle `achievements`)**:
  - "Sammler": 50 einzigartige Tiere besitzen  
  - "Speedrunner": Parkour Level 12 in < 60 Sek  
  - "Social Butterfly": 10 Freunde  
  - "Veteran": 7 Tage hintereinander spielen
- **Rang-System** (basierend auf Coins/Tickets verbrannt):
  - Bronze → Silver → Gold → Platin  
  - Visuelles Badge im Profil
  - Bonus: Seltenere Tiere freischalten ab Platin

### 2.3 Season-Pass oder Battle Pass (Premium-Option)
- **Struktur:**
  - Kostenlos: 10 Belohnungen über 14 Tage  
  - Premium (1.000 Tickets): +20 exklusive Belohnungen
  - Skins, Titel, exklusive Events
- **Beispiel April 2026:** "Dschungel-Season" — Dschungel-Skins, Dschungel-Tiere, Jungle-Parkour-Level

### 2.4 Cosmetics & Tier-Fusion
- **Problem:** Coins/Tickets sind nur Wirtschaft, keine visuellen Unterschiede
- **Lösung:**
  - Tier-Fusion: 3× Normales Panda → 1× Gold-Panda (größer, glitzert) — *nur kosmetisch*
  - Auto-Skins: Habe 100 dieser Tiere → "Dino-Auto" freigeschaltet (in der World)
  - Avatar-Hüte: Pro 10 Tiere einer Art einen Hut verdienen
  - Diese im Shop kaufbar (300–500 Coins pro Hut)

### 2.5 Social-Mechaniken ausbauen
- **Friend-Quests:**
  - "Sende einen Match-Gift an einen Freund" → beide +100 Coins
  - "Fordere einen Freund zu Parkour heraus" → Leaderboard für diesen Run
- **Chat/Nachrichten:** Einfache Nachrichten zwischen Freunden (nicht vollständiges Chat-System, nur 1-1)
- **Gilden/Clans** (zukünftig): 3–10 Spieler können einen Clan gründen, gemeinsame Events, Clan-Leaderboard

### 2.6 Dynamisches Balancing & Content-Roadmap
- **Problem:** Game kann schnell zu einfach oder zu schwer werden
- **Lösung:**
  - Monatliche Balancing-Patches (z. B. "Neue Tiere kosten jetzt 20% mehr")
  - Öffentliche Roadmap (`/roadmap`) zeigt: Kommende Features, Voting für nächstes Event
  - Community-Feedback akzeptieren: "Was wollt ihr nächsten Monat?"

---

## 3. Technische Verbesserungen (Backend & UX)

### 3.1 Performance-Optimierungen
- 3D-Welt: Max. 24 Remote-Spieler, aber Mobile kann noch optimiert werden
- Memory: Board wird erst beim ersten Flip generiert (lazy init)
- Asset-Lazy-Loading: Emojis/Skins laden on-demand

### 3.2 Push-Notifications
- "Ein Freund hat dich herausgefordert!"
- "Neues Event: Safari-Abenteuer startet in 2 Stunden"
- "Dein Tier ist huntig — Zeit zu füttern!"

### 3.3 Offline-Verbesserungen
- Coins offline sammeln (existiert bereits als `offline_coins`)
- Zeige Offline-Einnahme prominenter auf Startseite
- "Willkommen zurück! Du hast 500.000 🪙 offline verdient"

### 3.4 Mobile-exklusive Features
- Vibrationen bei wichtigen Events (Tier-Unlock, Level-Complete)
- Barcode-Scan für Freunde-Einladung (QR mit User-ID)
- Offline-Modi: Memory & Parkour spielbar ohne Internet (lokale Scores)

---

## 4. Konkrete nächste Steps (Priorität)

### Phase 1: MVP (Diese Woche)
- [ ] Event-Kalender-Doku schreiben (Dezember–Februar 2026)
- [ ] Achievements-Grundgerüst (DB + 5 einfache Achievements)
- [ ] Onboarding-Overlay für erste 3 Schritte

### Phase 2: Spieler-Retention (Nächste 2 Wochen)
- [ ] Tägliche Quests pro Event
- [ ] Rang-System (Bronze–Platin)
- [ ] Cosmetics: Tier-Fusion Panda (normal→gold)

### Phase 3: Social & Langfrist (Danach)
- [ ] Friend-Quests
- [ ] Battle Pass / Season Pass (Premium)
- [ ] Clan-System Design

---

## 5. Metriken zum Messen

- **Neulinge:**
  - % der Spieler, die Onboarding komplett machen
  - Average Time to First Minigame
  - Retention nach Tag 1, 3, 7

- **Bestehende Spieler:**
  - Daily Active Users (DAU)
  - Session Length (durchschnittlich)
  - Event-Partizipation Rate
  - Friend-Requests per User

---

## Ressourcen im Repo

- Design-Specs: `docs/superpowers/specs/` (alle Features)
- Pläne: `docs/superpowers/plans/` (Implementierungs-Roadmaps)
- Minispiele: Memory, Parkour, Drift, Wordle, Boss-Fight, World
- Tech Stack: Vue 3 + Pinia + Supabase + Three.js (Minispiele/3D)

---

**Nächste Meetings:**
- Design Review: Achievements UI  
- Balancing: Coin-Kosten für Tier 5+  
- Social: Friend-Request-Fehler-Handling (AGENTS.md: `friend_requests_settings`)
