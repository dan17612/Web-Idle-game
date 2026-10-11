# Zoo Empire — Nächste Schritte für Spielererlebnis (Q4 2026)

**Datum:** 2026-09-23  
**Ziel:** Das Spiel nachhaltiger für Neulinge und bestehende Spieler gestalten.

---

## 1. Onboarding & Neulinge (Priorät: SEHR HOCH)

### 1.1 Strukturiertes Willkommens-Tutorial
**Problem:** Neue Spieler verstehen nicht sofort, wie das Spiel funktioniert — wo fangen sie an, was sind die Kerngameplay-Loops?

**Lösung:**
- **Tutorial-Sprints** (3–5 gelenkte Schritte):
  1. **Tap-Mechanik**: Erstes Tier kaufen, antippen, Münzen verdienen
  2. **Shop**: Upgrade-Sinn verstehen (Multiplikator, mehr Taps, Offline)
  3. **Erstes Minispiel**: Memory oder Parkour für Rewards
  4. **Zoo-Welt erkunden**: Anderen Spielern begegnen (Social!)
  5. **Freunde einladen**: Erstes Einladungs-Reward

- **Toast-Hinweise** statt modaler Dialoge (weniger invasiv)
- **Skip-Button** für erfahrene Spieler (kein erzwungenes Onboarding)
- **Häufig gestellte Fragen (FAQ)** im Profil-Tab für Notfälle

**Testszenarien:**
- Neuspieler-Flow startet, kein Verständnis-Bottleneck
- Fortgeschrittener sprintet durch Tutorial
- Tipp: First-Time-User-Event (5×Bonus-Coins bei Klick #5) messen

---

### 1.2 Progression-Transparenz
**Problem:** Spieler wissen nicht, was als nächstes kommt — warum sollten sie weiterspielen?

**Lösung:**
- **Roadmap im Spiel**: Neue, zukommende Features im Profil anzeigen (z.B. „Event: Dinosaurier-Ei nächste Woche")
- **Tier-Unlock-Pfad**: Zeig, welche Tiere noch bevorstehen (visual chain)
- **Monatliche Ziele** (optional, keine Verpflichtung):
  - Beispiel: „50 Tier sammeln", „alle Minispiele spielen"
  - Reward: 500 Coins bonus

**Implementation:**
- Neue Tabelle: `progression_milestones` (id, user_id, type, completed_at)
- UI in `GameView.vue` oder neuer `ProgressionView.vue`

---

## 2. Retention & Bestehende Spieler

### 2.1 Tägliche Login-Streaks & Belohnungen
**Problem:** Spieler kehren nicht täglich zurück — Idle-Games brauchen tägliche Gewohnheiten.

**Lösung:**
- **Login-Streak-System**:
  - Tag 1–3: 100 Coins
  - Tag 4–7: 200 Coins + 1 Ticket
  - Tag 8+: 500 Coins + 2 Tickets + Mystery-Ei
  - Streak-Bruch: Reset nach 2+ Tagen Abwesenheit (mit Gnade-Regel: alle 7 Tage 1 kostenlos zurücksetzen)

- **Visuelle Belohnung**: Streak-Counter in der Top-Leiste (z.B. 🔥 15) mit Celebrations bei Meilensteinen

**Implementation:**
- `daily_login` Tabelle: user_id, date, streak_count, reward_taken
- RPC: `claim_daily_reward()` → Streak-Logik, Coinsvergabe
- Modal: DailyRewardModal (bereits teilweise vorhanden, erweitern)

---

### 2.2 Wöchentliche Events mit klaren Zyklen
**Problem:** Drift und Parkour sind jetzt beendbar, aber es gibt kein regelmäßiges Angebot für WoW-Feeling.

**Lösung:**
- **Weekly Rotation** (jede Woche eine andere Aktivität prominent):
  - Woche 1: Drift-Marathon (doppelte Rewards)
  - Woche 2: Parkour-Challenge (zusätzliche Level-Slots)
  - Woche 3: Memory-Tournament (Leaderboard-Saison)
  - Woche 4: Zoo-Welt-Jagd (spezielle seltene Tiere nur in dieser Woche zu finden)

- **Teasers & Ankündigungen**: Spieler wissen am Wochenende, was Montag kommt

**Implementation:**
- `event_schedule` erweitern: `weekly_rotation` enum (drift, parkour, memory, world)
- GameView zeigt „Diese Woche: Drift-Marathon 2x" prominent

---

### 2.3 Achievements & Badges
**Problem:** Langzeitspieler haben wenig emotionale Meilensteine außer Tier-Sammlung.

**Lösung:**
- **Achievements** (selbst erstellbar, z.B.):
  - 🎯 „Tap-Master": 1M Coins durch direktes Tappen verdient
  - 🐅 „Sammler": Alle normalen Tiere besessen
  - 🏎️ „Drift-König": 10× Level 5 Drift abgeschlossen
  - 👥 „Sozialbutterfly": 10 Freunde hinzugefügt
  - 🌍 „Zoo-Explorer": Alle Bauplätze der Zoo-Welt besucht

- **Badges im Profil**: Kleine, farbige Icons zeigen Achievements (sharable)
- **Rewards**: Jedes Achievement gibt 50–200 Coins + visuelles Badge

**Implementation:**
- `achievements` Tabelle: id, slug, name, description, icon, reward_coins
- `user_achievements` Tabelle: user_id, achievement_id, earned_at
- Trigger/RPC: `check_and_award_achievements(user_id)` nach bestimmten Aktionen

---

## 3. Soziale Features & Sichtbarkeit

### 3.1 Clan/Allianz-System (Stretch-Goal)
**Problem:** Freunde-Feature existiert, aber kein kollektiver Zweck.

**Lösung:**
- **Clans** (2–20 Spieler):
  - Mitglieder sehen Fortschritt füreinander
  - Wöchentliche Clan-Ziele (z.B. „200 Level Memory zusammen")
  - Clan-Belohnungen (je mehr Spieler beitragen, desto höher der Bonus)
  - Clan-Chat (simple Nachrichten unter Freunden)

- **Admin-Panel**: Clan-Gründer kann Regeln setzen, Spieler kick'en

**Implementation:** Datenbank-Schema, spezieller API-Endpoint, dedizierte View

---

### 3.2 Social Sharing & Viral-Loops
**Problem:** Spieler haben wenig Anreiz, Freunde einzuladen.

**Lösung:**
- **Referral-Rewards** (Upgrade des bestehenden Systems):
  - Einlader erhält: +500 Coins + ein Mystery-Ei
  - Eingeladener erhält: +500 Coins + 2 Tickets (beim 1. Login)
  - Beide werden in Leaderboard-Kategorie „Most Friends Invited" gezeigt

- **Share-Buttons**: Nach Achievements, großen Fortschritten (z.B. erste Rainbow-Tier)
  - Text: „Ich habe den Lila-Flamingo bekommen! 🦅💜 Kannst du mehr Tiere sammeln?"

---

## 4. Quality-of-Life & Balancing

### 4.1 Anti-Frustration (für mittlere Spieler)
- **Soft-Currency-Knappheit**: Review, ob Tickets schnell genug verdient werden
  - Tipp: Ticket-Ausgabe um 15% erhöhen oder tägliche Tickét-Bonus einführen
- **Offline-Passive**: Spieler ohne aktives Gerät sollten trotzdem verdienen (bereits da, aber Wert validieren)

### 4.2 Beginner-Freundliche Balancing
- **Shop-Rotation**: Nicht-legendäre Tiere sollten früh erscheinen (Kosten < 5000 Coins)
- **Minispiel-Difficulty**: Memory und Parkour Level-Curve validieren (nicht zu hart ab Level 3)
- **Erste Rewards großzügig**: Erste 24h sollten sich schnell anfühlen (10×Coins-Bonus am Anfang)

---

### 4.3 Performance & Mobile
- **Durchschnittliche Session-Länge**: Ist sie > 5 Minuten bei Neulingen? (Ziel: ja)
- **Crash-Raten**: Android-WebGL-Probleme monitoren (welt.js 3D-Memory ist teuer)
- **Load-Zeit**: Spielstart sollte < 3s sein (Vite-Optimierungen)

---

## 5. Monetarisierung & Premium (Optional)

### 5.1 Battle Pass / Season Pass (Q1 2027)
- **Kostenlos + Premium-Tier** (ähnlich Fortnite):
  - Freier Track: wöchentliche Ziele, kleine Rewards
  - Premium (2,99 €/Monat): exklusive Tiere, Skins, Coins
  - Saisonale Dauer: 4 Wochen, dann neu

### 5.2 Cosmetics (nicht Pay-to-Win)
- **Tier-Skins** (z.B. „Golden Dragon" statt „Dragon")
- **Avatar-Customization** (weitere Emoji, Hüte)
- **Kosten**: 300 Coins oder 4,99 € (Preis in USD anpassen)

---

## 6. Metriken & Tracking

Um zu messen, ob Verbesserungen wirken, diese Events loggen:

| Metrik | Bedeutung | Ziel |
|---|---|---|
| `DAU` (Daily Active Users) | Rückkehr von Spielern | +25% in 8 Wochen |
| `Avg. Session Length` (Neulinge) | Verstehen Gameplay | > 5 Min |
| `Day 1 Retention` | Erstes Willkommensgeschenk wirkt | > 40% |
| `Day 7 Retention` | Wöchentliche Events wirken | > 25% |
| `Tier-Collection Rate` | Balancing & Motivate | Mittel: 50% Tiere nach 2 Wochen |
| `Minispiel-Komplettierung` | Inhalts-Engagement | > 60% spielen Memory einmal |
| `Referral Conversion` | Virale Schleifen | > 10% geladener Freunde bleiben |

---

## 7. Implementierungs-Roadmap

### Phase 1 (Wochen 1–2)
- ✅ Daily Login Streaks
- ✅ Tägliche Willkommens-Geschenke (Upgrade)
- ✅ FAQ/Hilfe-Modal

### Phase 2 (Wochen 3–4)
- ✅ Achievements & Badges (Kern-System)
- ✅ Weekly Event Rotation
- ✅ Referral-Rewards (Upgrade)

### Phase 3 (Wochen 5–6)
- ✅ Onboarding-Tutorial
- ✅ Progression-Roadmap
- ✅ Performance-Audit

### Phase 4 (Wochen 7–8, Stretch)
- 🔄 Clan-System Grundlagen
- 🔄 Social Sharing

---

## 8. Nicht in diesem Cycle

- **Chat-System** (komplex, MVP reicht mit Discord-Link)
- **Guilds mit Gebäuden** (zu viel Scope für Q4)
- **Komplexe PvP-Modi** (starten mit Leaderboards)
- **Marketplace für User-zu-User-Handel** (Sicherheitsrisiko)

---

## 9. Offene Fragen

1. **Budget:** Gibt es Designer für UI-Anpassungen?
2. **Zeitplan:** Ist Q1 2027 realistisch für Battle Pass?
3. **Monetarisierung:** Muss das Spiel nach 2026 Geld verdienen?
4. **Plattform-Priorität:** iOS vor Android oder parallel?

---

## Zusammenfassung

Diese Roadmap konzentriert sich auf **drei Kernsäulen**:

1. 🎯 **Neulinge verstehen das Spiel schneller** (Onboarding, Tutorial)
2. 📊 **Spieler kehren täglich zurück** (Streaks, wöchentliche Ziele)
3. 👥 **Soziales Engagement steigt** (Achievements, Referrals, später Clans)

Mit dieser Strategie sollte die **Retention um 20–40%** steigen, und das Spiel wird weniger wie ein „dummes Tap-Clicker" und mehr wie ein echtes Idle-Game mit Community-Zweck wirken.

---

**Nächster Schritt:** Mit Stakeholdern Prioritäten klären, dann Phase 1 starten.
