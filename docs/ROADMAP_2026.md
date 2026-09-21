# Zoo Empire — Roadmap 2026-2027

**Stand:** 21. September 2026  
**Ziel:** Das Spiel wettbewerbsfähig & süchtig machend für Anfänger, belohnend für etablierte Spieler.

---

## 📊 Aktueller Status

### Implementiert (Sept 2026)
- ✅ Core: Tier-Sammlung, Leveln, Tap-Wirtschaft
- ✅ Minispiele: Memory, Drift, Parkour, Wordle, Boss-Kampf (Pfad + Endless)
- ✅ Maschinen: Crafter (Rezepte), Fusion (Tier-Upgrade), Eier-Maschine
- ✅ Welt: 3D Zoo-Lobby mit Tieren, Farmen, Realtime-Multiplayer
- ✅ Sozial: Freunde, Trading, Sending, Support-Panel mit Threads
- ✅ Bestenlisten: 6 Disziplinen (Münzrate, Münzen, Boss, Memory, Merge, Wordle)
- ✅ Events: Memory, Drift, Parkour, Boss, Wordle mit aktivem Zeitplan

### In Arbeit
- 🔄 Event-Hub Redesign (Emoji-Fix, Collapse-UX)
- 🔄 Gesamt-Rangliste (9 Disziplinen, Punkte-Aggregation)
- 🔄 Zucht-Ereignis (2 Tiere → Ei → Ausbrüten)

---

## 🎯 Nächste Schritte (Q4 2026)

### Phase 1: **Onboarding & New-Player Ramp** (Woche 1–3)

**Problem:** Neue Spieler verstehen nicht, wie die Wirtschaft funktioniert, wohin sie hinarbeiten.

**Lösung:**

1. **Interaktives Onboarding-Flow**
   - Tutorial-Bubbles erweitern (aktuelle `TutorialBubble` komponente nutzen)
   - Spieler durch erste 5 min führen: Tap → Tier kaufen → Ausrüsten → Minispiel starten
   - Checkpoint: „Dein erstes Minispiel abgeschlossen" = Bonus-Coins (100%)
   - UX-Metriken: Completion-Rate der ersten 3 Minuten tracken

2. **Neulinge-Geschenk-System erweitern**
   - Aktuell: Start-Tap-Bonus
   - Neu: Starter-Pack nach Tag 1 (ein Bronze-Tier + 1000 Coins)
   - Nach Tag 7: Mini-Medaille „7 Tage dabei" im Profil
   - Ziel: 30-Tage Retention erhöhen

3. **Progress-Milestone-Visuels**
   - GameView: Sichtbare Schritte anzeigen
   - „Level 0 → 5 erreicht" = Pop-up mit Belohnung
   - „100 Münzen verdient" = Achievement-Badge (sichtbar im Profil)

**Owner:** Frontend + Game Design  
**Metrik:** 60% der Neulinge starten min. 1 Minispiel in Woche 1

---

### Phase 2: **Progression Clarity** (Woche 2–4)

**Problem:** Spieler wissen nicht, ob sie „gut" spielen oder wo die nächste Hürde liegt.

**Lösung:**

1. **Achievement-System**
   - Lokale DB-Tabelle: `achievements` (title, emoji, criteria, hidden_until_earned)
   - Beispiele:
     - 🏆 „Erste Million" → 1.000.000 Münzen verdienen
     - ⭐ „Fünf Sterne" → 25 Sterne in einem Minispiel
     - 🧬 „Meister der Fusion" → 10 Tiere auf Episch upgraden
   - View: Achievements-Seite in ProfileView (auch fremde Profile)
   - Belohnung: +50 Coins pro Achievement (nicht wirtschaftlich, aber psychologisch wichtig)

2. **Tier-Roadmap im Shop**
   - Shop zeigt nicht nur aktuell verfügbare Tiere
   - Neu: „Nächste Tier-Arten verfügbar ab Level X"
   - Beispiel: Einhorn wird „freigeschaltet" wenn Spieler 5 Tiere auf Gold hat
   - Ziel: Langfristige Ziele sichtbar machen

3. **Minispiel-Progression im Detail**
   - Memory: „Level X / Max Level 30" anzeigen
   - Drift: „Nächster Track freigeschaltet bei Level Y"
   - Wordle: Streak-Counter prominent anzeigen
   - Ziel: „Wo bin ich, was kommt nächstes" klaren machen

**Owner:** Frontend + Game Balance  
**Metrik:** Avg. Session-Länge um 20% erhöhen

---

### Phase 3: **Engagement für Etablierte** (Woche 3–5)

**Problem:** Nach 30 Tagen: Spieler sehen nur Wiederholungen, keine neuen Ziele.

**Lösung:**

1. **Seasonal Events (Monatlich)**
   - Sept: Halloween-Event (spezielle Tier-Varianten: 🧟 Zombie-Tiger)
   - Okt: Erntedank (Bundle-Discount für 3 Tiere kaufen)
   - Nov: Black Friday (Shop-Roulette: Zufälliges Tier -50%)
   - Dezember: Jahresend-Gala (Leaderboard-Finale mit Trophäe)
   - Umsetzung: `event_schedule` erweitern + spezielle UI-Overlays
   - Belohnung: Exklusive Emojis/Leinenfärben für Platz 1–10

2. **Weekly Challenges**
   - Beispiel: „Verdiene diese Woche 500k Coins" (Reward: +20 Tickets)
   - Beispiel: „Vollende 3 Memory-Level" (Reward: 1 Rare-Tier Ei)
   - Reset: Jeden Montag 00:00 UTC
   - Persistierung: `weekly_challenges` Tabelle
   - UX: Banner oben im GameView, Fortschritt sichtbar

3. **Season-Pass (Einfach, nicht Blockchain)**
   - Kostenlos: 20 Levels à 5 Tage
   - Premium (kostenpflichtig, später): Doppelte Belohnungen
   - Belohnungen: Coins, Tickets, Tiere, exklusive Leinenfärben
   - Einfache Monetisierung: €2–3 pro Season, 30% der aktiven Spieler interessiert

**Owner:** Game Design + Backend  
**Metrik:** 40% der 30+-Tage-Spieler completeten min. 1 Weekly Challenge

---

## 📅 September–November Planung

### Week 1–2 (Sept 21–Oct 4): **Event-Hub + Gesamt-Rangliste** (In Progress)
- ✅ Emoji-Font-System (`src/emojiFont.js`)
- ✅ Event-Hub mit Collapse-UX
- ✅ Ranglisten-RPC für Drift/Parkour
- ✅ Gesamt-Rangliste im LeaderboardView Tab

**Output:** Spieler sehen klarer, welche Events aktiv/beendet sind, eine universelle Rangliste

---

### Week 2–3 (Sept 28–Oct 11): **Zucht-Ereignis**
- Spec `2026-09-19-zucht-ereignis-design.md` committen
- Tier-Paarung wählen → Egg-Config speichern → Eincubator-UI
- RPC: `breed_animals`, `incubate_egg`, `hatch_egg`
- Reward-Spiegel: Egg-Rarity basierend auf Tier-Raritäten
- Event-Schedule: Zucht läuft durchgehend (keine Endzeit)

**Output:** Ein weiterer Progression-Knoten für Spieler (mehr Tiere → mehr Zucht-Optionen)

---

### Week 3–4 (Oct 5–18): **Anfänger-Onboarding** [Phase 1]
- Tutorial-Bubbles erweitern (ziele: 5 Min Erstspiel-Flow)
- Starter-Pack RPC: Nach 24h logged ein Tier + 1000 Coins
- Progress-Milestones im GameView (visuell)
- Test: Einige Anfänger-Accounts testen

**Output:** Neue Spieler verstehen erste Steps besser, höhere Day-1 Retention

---

### Week 4–5 (Oct 12–25): **Achievement-System** [Phase 2]
- DB-Migration: `achievements` Tabelle
- 15–20 achievements definieren (Design + Balance)
- Frontend: Achievement-Detail-View im Profil
- RPC: `get_user_achievements`, Unlocking-Logic
- Tests: SQL-RLS, Client-Side Logik

**Output:** Spieler sehen konkrete Langzeit-Ziele im Profil

---

### Week 5–6 (Oct 19–Nov 1): **Weekly Challenges** [Phase 3]
- DB: `weekly_challenges` Tabelle + RPC für Fortschritt
- Challenges UI im GameView Top-Banner
- Rotation-Logik: 5–6 verschiedene Challenge-Templates
- Reward-Spiegel: Challenge → coins/tickets
- Admin Panel: Challenges manuell definierbaren (oder Template-basiert)

**Output:** Etablierte Spieler haben wöchentliche, belohnende Ziele

---

### Week 6–8 (Oct 26–Nov 8): **QA + Tuning**
- Balancing aller Rewards (keine Inflation, keine Deflation)
- Cross-Feature-Tests (Challenges + Zucht kombinierbar?)
- A/B-Test: Onboarding-Flow mit 10% Neulinge
- Bug-Fixes aus User-Feedback (RoadmapView)

---

## 🔮 November–Dezember: Seasonal Events

### Nov 1–7: **Jahresend-Event-Planung**
1. Halloween-Nachzügler: 🧟 Zombie-Tiere (Variante von 3 Basen)
2. Early Christmas: Shop-Dekoration, Gold-Tiere Discount
3. Limited-Time-Boss: „Schneekönig" (3× stärker als normaler Boss)

### Nov 8–30: **Black Friday / Cyber Monday**
- Schaufel-Angebot: 1000 Coins für €0,99 (Test)
- Season-Pass-Launch (kostenlos Tier 1–10)
- Double-Coin-Wochenende (Fr–So)

### Dec 1–25: **Winter-Special**
- Advent-Kalender: Tägliche Mini-Rewards (Coins, Tickets, Tiere)
- Frohe-Weihnachten-Event-Boss
- Schnee-Effekte in der Zoo-Welt (Kosmetik)
- Jahres-Finale-Leaderboard mit Rang-Trophäen

---

## 🎯 KPIs zum Tracken

| KPI | Ziel | Methode |
|-----|------|--------|
| **New User Retention (Day 1)** | 60% → 75% | App Analytics |
| **New User Retention (Day 7)** | 30% → 45% | App Analytics |
| **Avg. Session Length** | 8 min → 12 min | Supabase Logs |
| **Weekly Active Users** | +20% YoY | Unique User IDs |
| **Achievement Completion Rate** | 40% | Custom Table |
| **Weekly Challenge Uptake** | 35%+ | Challenge Status |
| **Minispiel Play Rate** | 70% of MAU | Custom Event Logs |

---

## 🛠️ Tech Debt & Infra

### Priorität: HIGH
- [ ] TypeScript Migration (perspektivisch, nicht jetzt)
- [ ] Component-Tests für Minispiele (Parkour Engine-Tests)
- [ ] Performance-Monitoring (Web Vitals Dashboard)

### Priorität: MEDIUM
- [ ] Supabase Edge Function für Weekly Challenge Reset
- [ ] Push-Notifications (Capacitor) für Challenge-Starts
- [ ] Analytics Dashboard (Metabase oder eigenes)

### Priorität: LOW
- [ ] Visueller Game-Balance-Calculator (interne Tool)
- [ ] Admin-Panel erweitern (Event-Scheduling UI)

---

## 📋 Erfolgs-Kriterien

✅ **Dieses Quarter als erfolgreich gilt:**
1. Event-Hub & Gesamt-Rangliste live
2. Zucht-Ereignis spielbar
3. Onboarding-Flow für Anfänger (+15% Day-1 Retention)
4. Achievement-System sichtbar im Profil
5. Weekly Challenges aktiv bei 30%+ etablierter Spieler
6. Weekly Active Users stabil oder leicht aufsteigend trotz saisonalen Schwankungen

---

## 🚀 Langfristige Vision (2027)

- **Q1 2027:** Guilds/Clans (Team-Zusammenarbeit, Clan-Kriege)
- **Q2 2027:** PvP-Arena für Minispiele (Ranked Wordle/Memory)
- **Q3 2027:** Kampagnen-Story (Zoo-Saga, Rätsel lösen → seltene Tiere)
- **Q4 2027:** Season-Pass mit Premium-Option (€2/Monat), Merchandise-Integration

---

## 📝 Notizen für Contributors

- **Sprache:** Deutsche Umlaute in i18n.js verwenden (ä ö ü ß)
- **Stil-Tokens:** `src/styles.css` checken, nie hardcoded Farben
- **Tests:** Pro neuer Datei `src/foo.js` → `src/foo.test.js`
- **Migrationen:** Eine pro Feature, `YYYYMMDD_feature.sql` Format
- **RPC-Sicherheit:** `search_path`, `security definer`, `revoke anon/public`
