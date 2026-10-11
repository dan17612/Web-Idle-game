# Zoo Empire: Nächste Schritte & Priorisierter Roadmap

## 🎯 Ziel
Mach Zoo Empire zum **Must-Play-Idle-Game** für Neulinge und Veteranen durch gezielte Features, Events und Engagement-Loops.

---

## 📊 Prioritäts-Matrix

### 🔴 KRITISCH (Diese Woche)
Diese Features wirken sich **unmittelbar** auf Newcomer-Retention aus.

#### 1. **In-Game Newcomer-Onboarding** (Story-Ansatz)
```
Problem: 40% der Spieler verstehen nach 5 Min nicht, was zu tun ist
Lösung: Interaktive Tutorials mit Pfeilen/Highlights
Impact: +25% 1-Week-Retention
Aufwand: 4–6 Stunden
```

**Konkrete Steps:**
- [ ] Neuen `OnboardingFlow.vue` erstellen
- [ ] 4 Schritte: Login → Shop → Inventory → Minispiel
- [ ] Blocker setzen (kann Shop erst nach Intro öffnen)
- [ ] Skip-Option für Veteranen

**Acceptance Criteria:**
- 90% neue Spieler sehen Onboarding
- <2 Min Durchspieldauer
- Conversion zu Minispiel-Play +20%

---

#### 2. **Tägliche Login-Streak-Anzeige**
```
Problem: Spieler sehen keinen Grund, täglich zu kommen
Lösung: Visuelle Streak-Counter + Bonussen
Impact: +35% DAU
Aufwand: 3–4 Stunden
```

**Konkrete Steps:**
- [ ] Streifen-Counter im Hub anzeigen (z.B. "14 Tage in Folge ✨")
- [ ] Milestone-Belohnungen: Tag 7 = 500 Coins, Tag 30 = Rare Tier
- [ ] Streak-Verlust verhindern (2 Tage Puffer?)
- [ ] Animation bei Streak-Erreichung

**Acceptance Criteria:**
- Sichtbar auf jeder Seite (z.B. in Kopfzeile)
- Min. 3 Milestone-Events
- Keine False-Positives (Timezone-Bugs)

---

#### 3. **Quick-Action-Buttons für unggespielte Spiele**
```
Problem: Spieler spielen nur 1–2 Lieblingsspiele
Lösung: "Du hast X noch nicht gespielt" Pop-up + Shortcut
Impact: +40% Minispiel-Vielfalt
Aufwand: 2–3 Stunden
```

**Konkrete Steps:**
- [ ] `gamePlayHistory` tracken (welche Spiele schon gespielt)
- [ ] Bei 3h Inaktivität: Pop-up mit ungepieletem Spiel vorschlagen
- [ ] CTA: "Jetzt spielen" → Direct zum Spiel
- [ ] A/B-Test: Mit vs. ohne Pop-up

**Acceptance Criteria:**
- Max 1 Pop-up pro Session
- Click-Through-Rate >30%
- Nur 1 nicht gespieltes Spiel pro Pop-up

---

### 🟠 HOCH (Diese 2 Wochen)
Diese erweitern das Engagment für Casual + Hardcore-Spieler.

#### 4. **Tier-Dex (Kollektion-Tracker)**
```
Problem: "Wie viel % hab ich schon gesammelt?" ist unklar
Lösung: Pokédex-artige Kollektion-Seite
Impact: +20% Langzeit-Retention (Completion-Drive)
Aufwand: 6–8 Stunden
```

**Features:**
- [ ] Alle 267+ Tiere in Grid anzeigen (besessen = farbig, fehlend = grau)
- [ ] Filterung: Nach Rarity, Typ, erhalten durch X
- [ ] Completion-% pro Kategorie
- [ ] Suchfunktion (z.B. "Alle Reptilien")
- [ ] Trade-Links für fehlende Tiere (zum Markt)

**Acceptance Criteria:**
- Laden <2 Sekunden
- Mobile-optimiert (Scroll-friendly)
- Tier-Icons deutlich erkennbar

---

#### 5. **Saisonale exklusive Tier-Kampagne**
```
Problem: Veteranen haben "alles schon"
Lösung: Monatlich 1–2 neue Tiere (nur diese Saison erreichbar)
Impact: +45% Wiederkehr-Spieler (FOMO-Drive)
Aufwand: 3–4 Stunden pro Tier (Art + Balance)
```

**Konkrete Kampagnen:**
- **Okt 2026:** Halloween-Fledermaus (über Puzzle-Sterne)
- **Nov 2026:** Thanksgiving-Truthahn (Breeding-Exclusive)
- **Dez 2026:** Winter-Eule (Event-Boss besiegen)
- **Jan 2027:** New-Year-Phoenix (Markt-Traders verdienen)

**Acceptance Criteria:**
- Keine Möglichkeit, im nächsten Monat zu erhalten
- Discord-Ankündigung 1 Woche vorher
- >60% Spieler versuchen, das Tier zu bekommen

---

#### 6. **Markt-Price-Alerts**
```
Problem: Trader müssen ständig Preise checken
Lösung: "Alert mich wenn <Tier> unter 50K Coins fällt"
Impact: +30% Markt-Aktivität
Aufwand: 4–5 Stunden
```

**Features:**
- [ ] Pro Tier max 2 Alerts speichern
- [ ] Email + In-Game-Popup wenn Alert ausgelöst
- [ ] 1-Stunden-Abstand zwischen Alerts (kein Spam)
- [ ] Alert-Übersicht (aktive/deaktivierte)

**Acceptance Criteria:**
- <5 False-Alerts pro 100 Tier-Preise-Änderungen
- Benachrichtigung <5 Min nach Trigger
- Alert-Deletion möglich

---

### 🟡 MITTEL (Diese 4 Wochen)
Diese stabilisieren das Langzeit-Engagement.

#### 7. **Leaderboards nach Minispiel**
```
Problem: Spieler spielen für persönliche Best-Scores, aber keiner sieht es
Lösung: Top-10-Leaderboard pro Spiel (Weekly-Reset)
Impact: +25% Competitive-Drive
Aufwand: 5–6 Stunden
```

**Implementierung:**
- [ ] Für jedes Spiel: `game_scores` Tabelle (player_id, game, score, week)
- [ ] Weekly-Reset: Neue `week_id` nach UTC-Mitternacht-Montag
- [ ] RPC: `get_leaderboard_for_game(p_game, p_week_offset)`
- [ ] UI: Top-10 mit eigene Position hervorgehoben

**Acceptance Criteria:**
- Resets arbeitsgenau zu UTC-Montag
- <500ms Load-Zeit
- Mobile-responsive

---

#### 8. **Guilds/Clans (MVP)**
```
Problem: Einzelne Spieler fühlen sich isoliert
Lösung: kleine Gruppen (3–50 Spieler) können zusammenarbeiten
Impact: +40% Social-Retention
Aufwand: 10–12 Stunden
```

**MVP-Features:**
- [ ] Clan erstellen (Lead kann max 3 Clans haben)
- [ ] Join mit Invitation-Link
- [ ] Clan-Chat (asynchron wie Tickets)
- [ ] Clan-Leaderboard (Coins kombiniert)
- [ ] Clan-Weekly-Goal: Z.b. "1M Coins verdienen" → Bonus für alle

**Datenmodell:**
```sql
clans (id, name, leader_id, created_at, member_count)
clan_members (clan_id, user_id, role, joined_at)
clan_messages (id, clan_id, sender_id, text, created_at)
```

**Acceptance Criteria:**
- Min 30% der Spieler treten Clan bei
- Clan-Member spielen +50% länger
- Kein Spam-Missbrauch

---

### 🟢 GERING (Nächster Monat)
Längerfristig-Features (Nice-to-Haves).

#### 9. **Battle-Pass-System**
```
Gratis-Pass: 5 Rewards/Woche (Coins, Items, Tiere)
Premium-Pass: +10 Zusatz-Rewards (Exklusive Kosmetik)
Impact: +$500/Monat Umsatz
Aufwand: 8–10 Stunden
```

#### 10. **Tier-Ausbildungs-Quests**
```
"Trainiere dein Tier 100 Runden Parkour" → Special Skin freischalten
Impact: +15% Minispiel-Engagment
Aufwand: 6–8 Stunden
```

---

## 🎯 Quick-Win-Liste (Für diese Woche!)

| Feature | Aufwand | Impact | Owner |
|---------|---------|--------|-------|
| Newcomer-Tutorial | 4h | 🔴 Kritisch | @frontend |
| Login-Streaks | 3h | 🔴 Kritisch | @frontend |
| Unggespielte-Spiel-Buttons | 2h | 🔴 Kritisch | @frontend |
| Saisonale Tier (Halloween) | 3h | 🟠 Hoch | @balance |
| Markt-Alerts | 4h | 🟠 Hoch | @backend |

**Total:** 16 Stunden = 2 Tage Fokus-Work

---

## 📅 Vorschlagener Kalender

```
KW 41 (11.10–17.10):
- Newcomer-Tutorial MVP
- Login-Streaks
- Unggespielte-Spiel-Pop-ups
[ CI/Tests grün ✅ ]
[ Deploy zu Production ✅ ]

KW 42–43:
- Tier-Dex bauen
- Saisonale Tier-Kampagnen
- Markt-Alerts
[ Beta mit 10% Spieler testen ]

KW 44–45:
- Leaderboards pro Spiel
- Guild MVP (Datenbankmodell + Chat)

KW 46:
- Battle-Pass UI
- Tier-Training-Quests
```

---

## 🚀 Success Metrics (Vor/Nach)

### Vor Implementierung (Baseline)
- DAU: 2,400
- 1-Week-Retention: 38%
- Avg Session: 18 Min
- Spiele pro Spieler: 2.1
- Market-Transaktionen: 12% der DAU

### Nach 6 Wochen (Target)
- DAU: 3,200 (+33%)
- 1-Week-Retention: 52% (+36%)
- Avg Session: 26 Min (+44%)
- Spiele pro Spieler: 3.5 (+67%)
- Market-Transaktionen: 18% der DAU (+50%)

---

## 💬 Feedback-Kanal

- **Roadmap-Tab:** Spieler können Features abstimmen
- **Support-Chat:** Direkte Kommunikation mit Admin
- **Discord:** Community-Feedback sammeln

---

**Fazit:** Zoo Empire hat bereits eine großartige Basis. Mit diesen gezielten Features werden sowohl Neulinge als auch Veteranen täglich zurückkehren wollen.

🦁🐘🦒 **Lass uns Zoo Empire zur coolsten Game-Experience machen!** ✨
