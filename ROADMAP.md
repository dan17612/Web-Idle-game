# 🗺️ Zoo Empire — Roadmap & Verbesserungsplan

> Stand: Mai 2026  
> Dieses Dokument listet behobene Bugs, geplante Verbesserungen und neue Feature-Ideen.

---

## ✅ Behobene Bugs (dieser Branch)

### Bug 1: `isUpgrading()` ignorierte Server-Offset
**Problem:** Die Funktion `isUpgrading(a)` in `animals.js` nutzte `Date.now()` ohne den Server-Offset.  
Wenn die Server-Uhr vorgeht, wurden Tiere als "fertig" angezeigt, obwohl der Server sie noch als "upgrading" behandelt. Dadurch wurden falsch kalkulierte Passive-Income-Werte angezeigt.

**Fix:** `isUpgrading(a, now = Date.now())` akzeptiert jetzt einen optionalen Zeitpunkt. Alle Aufrufe im Store übergeben `Date.now() + this.serverOffset`.

---

### Bug 2: `autoReleaseSweep` ohne `persist()` davor
**Problem:** Beim automatischen Freilassen von Tieren wurden die aufgelaufenen `tickCoins` nicht zuerst gespeichert, was bei einem anschließenden Absturz zu Coin-Verlust hätte führen können.

**Fix:** `autoReleaseSweep()` ruft jetzt `await this.persist()` vor allen Operationen auf.

---

### Bug 3: Tap-Float zeigte falsche Schätzung
**Problem:** Der sofort angezeigte Tap-Gewinn nutzte `ratePerSec` (Passiv-Einnahmen pro Sekunde) als Schätzung – eine komplett andere Metrik als der tatsächliche Tap-Verdienst.

**Fix:** Die Komponente merkt sich den letzten tatsächlichen Tap-Verdienst (`lastTapEarned`) und nutzt ihn für spätere Taps. Beim ersten Tap wird `tapMultiplier` als Fallback genutzt.

---

### Bug 4: Fehlender Null-Check bei `data.earned`
**Problem:** Wenn der Server kein `earned`-Feld zurückschickt, wurde `"+0"` im Float angezeigt.

**Fix:** `data?.earned != null`-Check vor dem Aktualisieren des Floats.

---

## 🔧 Kurzfristige Verbesserungen (nächste Sprints)

### UX-Verbesserungen
- [ ] **Tap-Cooldown visuell verbessern:** Animierter Fortschrittsring um den Tap-Button zeigt verbleibende Zeit bis zur Tap-Regeneration
- [ ] **Rate-Vorschau beim Hover:** Beim Hover über ein Tier im Inventar sofort die Einnahmen-Rate anzeigen
- [ ] **Sortier-Optionen im Inventar:** Nach Rate, Tier, Spezies, Kaufdatum sortieren
- [ ] **Animierter Coin-Counter:** Sanfte Animation beim Hochzählen der Münzanzeige (statt sofortigem Sprung)
- [ ] **Upgrade-Fortschrittsbalken:** Visueller Fortschrittsbalken für Tier-Upgrades mit Countdown
- [ ] **Batch-Equip-Bestätigung:** Warnung wenn "Beste ausrüsten" aktuell ausgerüstete Tiere ersetzen würde

### Performance
- [ ] **`rateForAnimal` Getter:** Cacht `Date.now() + serverOffset` pro Render-Frame um wiederholte Berechnungen zu vermeiden
- [ ] **Tier-Upgrade-Status:** Interval-basierter Check (`setInterval`, 1s) anstatt bei jedem Frame-Tick
- [ ] **Supabase-Realtime:** Tier-Upgrade-Fertigstellung über Realtime-Channel statt Polling

### Code-Qualität
- [ ] **TypeScript:** Schrittweise Migration zu TypeScript für bessere IDE-Unterstützung und Fehlervermeidung
- [ ] **Unit Tests:** Tests für `formatCoins`, `parseCoinInput`, `compareAnimalsByRate`, `isUpgrading` und Store-Aktionen
- [ ] **Zentrales Error-Handling:** Einheitlichen Error-Interceptor für Supabase-Fehler statt verstreuter catch-Blöcke

---

## 🚀 Mittelfristige Features (1–3 Monate)

### 🎁 Tägliches Login-Bonus-System
**Beschreibung:** Spieler die täglich einloggen erhalten gestaffelte Belohnungen.  
**Details:**
- Tag 1-6: Münzen (skaliert mit Level)
- Tag 7: Garantiertes Tier der nächsthöheren Spezies
- Streak bricht bei verpasstem Tag ab
- Server-seitig validiert (kein Client-Cheat möglich)
- Anzeige: Modal beim App-Start wenn Bonus verfügbar

**Technisch:**
- Neue Spalte in `profiles`: `login_streak`, `last_login_bonus_at`
- RPC `claim_login_bonus()` mit Server-Zeitvalidierung

---

### 🏆 Achievement-System
**Beschreibung:** Meilenstein-Abzeichen für langfristige Motivation.  
**Beispiele:**
- 🐉 "Erster Drache" – Ersten Drachen kaufen
- 💰 "Millionär" – 1.000.000 Münzen besitzen
- 👆 "Tapper" – 1.000 Taps gesamt
- 🌈 "Regenbogen" – Erstes Rainbow-Tier erreichen
- ⚔️ "Boss-Besieger" – Stage 10 im Boss-Pfad abschließen
- 👥 "Sozialer Butterfly" – 5 Freunde hinzufügen
- 🏭 "Crafter" – Ersten Craft abschließen

**Belohnungen:** Münzen, Tickets, spezielle Title/Emojis für Profil

**Technisch:**
- Neue Tabelle `achievements` (id, player_id, achievement_key, claimed_at)
- RPC `check_achievements()` prüft serverseitig Bedingungen
- Trigger nach wichtigen Aktionen (buy_animal, complete_boss_stage, etc.)

---

### 📊 Statistik-Screen
**Beschreibung:** Übersicht über die eigene Spielhistorie.  
**Inhalte:**
- Gesamt verdiente Münzen (lifetime)
- Gesamt-Taps
- Stärkster passiver Einkommenswert (Peak Rate)
- Lieblings-Tier / Lieblings-Spezies
- Boss-Pfad-Rekord
- Tage seit erstem Login
- Freigelassene Tiere total

**Technisch:**
- Neue Spalte/Tabelle `player_stats` für kumulierte Werte
- Trigger auf wichtige RPCs zum Inkrementieren

---

### 🔔 Push-Benachrichtigungen (Capacitor)
**Beschreibung:** Spieler werden benachrichtigt wenn:
- Offline-Kapazität voll ist (8h Grenze erreicht)
- Pet-Boost abgelaufen ist
- Tier-Upgrade fertig ist
- Neues Boss-Event gestartet hat
- Freundschaftsanfrage eingegangen ist

**Technisch:**
- Capacitor Push-Notifications Plugin
- Server-Timestamp-basierte Scheduling (via Supabase Edge Functions + cron)

---

## 💡 Langfristige Feature-Ideen (3–12 Monate)

### 🏰 Prestige-System
**Beschreibung:** Nach Erreichen eines Milestones (z.B. alle Spezies auf Rainbow) kann der Spieler "prestigen" – setzt Fortschritt zurück, erhält aber permanente Multiplikatoren.

**Details:**
- Prestige-Level 1–10
- Jedes Level: +X% auf alle Einnahmen permanent
- Besonderes Prestige-Badge auf Profil
- Exklusive Prestige-Only Spezies freischalten

---

### 🌍 Gilden/Clans
**Beschreibung:** Spieler schließen sich zu Gruppen zusammen für kooperative Ziele.

**Details:**
- Gilde erstellen/beitreten (max. 30 Mitglieder)
- Gilden-Coins: Mitglieder spenden Münzen in die Gildenkasse
- Gilden-Upgrades: Gemeinsamer Bonus für alle Mitglieder
- Wöchentliche Gilden-Herausforderungen
- Gilden-Rangliste

---

### 🎡 Saisonale Events
**Beschreibung:** Zeitlich begrenzte Events mit exklusiven Belohnungen.

**Beispiele:**
- 🎃 Halloween: Grusel-Tiere (Fledermaus, Geist, Kürbis)
- 🎄 Weihnachten: Rentier-Event, tägliche Adventskalender-Belohnungen
- 🐣 Ostern: Egg-Hunt-Minispiel
- 🎆 Neujahr: Doppel-Coin-Wochenende

---

### 🤝 Tier-Tauschbörse v2
**Beschreibung:** Verbessertes Trading-System.

**Verbesserungen:**
- Auktion statt Festpreis (Bieten möglich)
- Watchlist für gewünschte Spezies/Tier-Kombinationen
- Trade-Historik und Statistiken
- "Bundle-Deals": Mehrere Tiere gleichzeitig handeln

---

### 📱 Widget-Support (iOS/Android)
**Beschreibung:** Homescreen-Widget das aktuelle Coin-Rate und Offline-Earnings anzeigt, ohne die App öffnen zu müssen.

---

### 🎮 PvP-Modus: Tier-Kampf
**Beschreibung:** Spieler kämpfen mit ihren besten Tieren gegeneinander in automatisierten Kämpfen. Belohnungen basierend auf Platzierung im wöchentlichen Turnier.

---

## 🐛 Bekannte Limitierungen (kein akuter Bug, aber verbesserbar)

| # | Beschreibung | Priorität | Aufwand |
|---|-------------|-----------|---------|
| 1 | `rateForAnimal`-Getter erstellt bei jedem Aufruf eine neue Closure → mäßige Performance bei vielen Tieren | Niedrig | Mittel |
| 2 | Gleichzeitiges Tippen auf mehreren Geräten kann zu kurzfristig inkonsistenten Tap-Counts führen | Niedrig | Hoch |
| 3 | Kein Retry-Mechanismus wenn Offline-Earnings-Sync fehlschlägt | Mittel | Niedrig |
| 4 | `parseCoinInput` unterstützt keine Exponent-Notation (z.B. "1e6") | Niedrig | Niedrig |
| 5 | `formatCoins` gibt für Zahlen ≥ 1Q (10^15) keine korrekte Einheit aus | Niedrig | Niedrig |

---

## 📐 Architektur-Verbesserungen

- **Server-Offset-Singleton:** `serverOffset` könnte als eigener Composable extrahiert werden, der regelmäßig aktualisiert wird (statt auf Tap/Feed-Responses zu warten)
- **Optimistic Updates mit Rollback:** Für Buy/Equip/Release-Aktionen lokale State-Updates direkt machen, bei Server-Fehler zurückrollen (statt await auf RPC)
- **Supabase Realtime für Trades:** Trade-Angebote in Echtzeit über Realtime-Subscriptions statt manuellem Polling
- **Error Boundary:** Vue Error Boundary um kritische Komponenten, damit ein Fehler nicht die ganze App crasht

---

*Letzte Aktualisierung: Mai 2026*
