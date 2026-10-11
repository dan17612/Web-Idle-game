# Zoo Empire — Strategy & Growth Documentation

**Version:** 2026-09-16  
**Maintainer:** Claude Code

---

## 📖 Übersicht

Diese Ordner enthält strategische Dokumentation zu Spieler-Onboarding, Retention und Feature-Integration. Alle Dokumente sind interdependent und sollten als Einheit gelesen werden.

---

## 📚 Dokumente in diesem Ordner

### 1. [Newcomer Onboarding Strategy](2026-09-16-newcomer-onboarding.md)

**Leserschaft:** PMs, Dev-Lead, Designer

**Inhalte:**
- 5-Phasen-Onboarding-Funnel (Minute 0–20)
- Progressive Feature-Disclosure
- UI/UX-Best-Practices für Anfänger
- Metriken zum Tracken (Sign-Up → First Purchase → First Minigame)
- Implementation-Roadmap (Sprint 1–3)

**Ziel:** Neue Spieler in <20 min zum Spielen bringen und <30% Churn in ersten 24h erreichen.

**Schnell-Skim:** Lies Sektion "Onboarding-Funnel" (Tabelle).

---

### 2. [Player Retention Strategy](2026-09-16-player-retention.md)

**Leserschaft:** PMs, Live-Ops, Analytics

**Inhalte:**
- Retention-Funnel für Week 1–4 und Month 2+
- Daily/Weekly/Monthly Loops für Lang-Term-Engagement
- Re-Engagement Triggers (Push-Notifs)
- Event-Kalender (Quarterly)
- Metriken (DAU, Churn-Curve, Minigame-Frequency)
- Quick-Wins (Notifications, Events, Social)

**Ziel:** Bestehende Spieler halten (50% DAU nach Tag 7, 30% nach Day 30).

**Schnell-Skim:** Lies Sektion "Retention-Funnel" (Tabelle) + "Re-Engagement Triggers".

---

### 3. [Feature Integration Guide](2026-09-16-feature-integration-guide.md)

**Leserschaft:** Tech-Leads, Feature-Owning Devs

**Inhalte:**
- Feature-Landkarte (alle 15+ Features mit Kategorien)
- Feature-Details nach Zielgruppe (Neulinge vs. Bestehende)
- Feature-Abhängigkeitsdiagramm (was braucht was)
- Psychologische Loops by Feature (Skinner Box, Social Proof, etc.)
- Churn-Risiken pro Feature + Mitigationen
- Implementation-Roadmap (kurz/mittel/langfristig)
- Testing-Checkliste

**Ziel:** Features nicht isoliert sehen, sondern als integriertes System.

**Schnell-Skim:** Lies "Feature-Landkarte" + "Feature-Abhängigkeiten".

---

## 🎯 Wie diese Dokumente zusammenhängen

```
NEWCOMER ONBOARDING (Tage 1–7)
       ↓
       Spieler lernt Farm + Wordle/Memory
       Spielt täglich 3–4 Minigames
       Kauft 5–8 Tiere
       ↓
RETENTION (Tage 8–30)
       ↓
       Spieler entwickelt Preference (Boss-Fight oder Parkour)
       Freundschafts-Features aktiviert
       Leaderboard-Konkurrenzkampf
       ↓
LONG-TERM ENGAGEMENT (Monat 2+)
       ↓
       4 Parallele Loops: Farm (passiv) + Minigames (aktiv)
       + Competitive (Leaderboard) + Social (World, Trades)
       ↓
SUSTAINABLE GAME (6+ Monate)
       Neue Events alle 2–4 Wochen halten Interest
       Neue Features (Parkour 3D, Boss-Path, etc.) geben Depth
       Social-Loop mit Freunden ist Primary Motivator
```

**Cross-Referenzen:**

- **Newcomer Doc** verweist auf spezifische UI-Komponenten → siehe **Feature Integration Guide** für technische Details
- **Retention Doc** schlägt Events vor → nutze **Feature Integration Guide** um zu sehen, welche Features verfügbar sind
- **Feature Integration Guide** erklärt Abhängigkeiten → nutze die anderen Docs um Priorisierung zu verstehen

---

## 🔄 Workflow: Wie man diese Docs nutzt

### Scenario 1: "Neue Feature X hinzufügen"

1. Lese **Feature Integration Guide** um zu verstehen, wo Feature X passt (Early, Mid oder Late Game)
2. Checke Dependencies: "Was muss schon existieren?"
3. Prüfe Churn-Risiken: "Könnte das Feature Spieler verlieren?"
4. Trage zur **Retention Doc** bei, wenn Feature neue Loops schafft

### Scenario 2: "DAU ist down, Spieler churnen nach Tag 3"

1. Lese **Newcomer Onboarding** Sektion "Metriken zum Tracken"
2. Checke welche Meilenstein Spieler verfehlen (z. B. "First Shop-Open dauert 15 min statt <5 min")
3. Lese **Feature Integration Guide** um zu sehen, ob Problem bei UI liegt (Buttons zu klein) oder Gameplay (Farm zu langsam)
4. Fix + Test

### Scenario 3: "Ein Minigame ist fertig, wir brauchen Release-Plan"

1. Lese **Feature Integration Guide**, finde Minigame in Abhängigkeiten
2. Bestimme: Für Neulinge oder Bestehende?
3. Nutze **Retention Doc** um zum Event-Kalender zu passen
4. Schreibe Rollout-Plan: "Week 1: Beta für 10% Spieler, Week 2: 100% Rollout"

---

## 📊 KPIs at a Glance

### Newcomer Phase (Tage 1–7)

| Metrik | Target | Rotes Tuch |
|--------|--------|-----------|
| Sign-Up → First Tap | <2 min | >5 min |
| First Tap → First Shop | <5 min | >15 min |
| First Shop → First Animal | <10 min | >20 min |
| Day 1 Churn | <30% | >50% |
| Day 7 Retention | >70% | <50% |

### Retention Phase (Woche 2–4)

| Metrik | Target | Rotes Tuch |
|--------|--------|-----------|
| DAU | >50% | <30% |
| Avg Session (Mid-Game) | 8–12 min | <5 min |
| Minigames pro Woche | 2–3 | <1 |
| Day 30 Retention | >30% | <15% |

### Sustainable (Monat 2+)

| Metrik | Target | Rotes Tuch |
|--------|--------|-----------|
| DAU | 20–30% (von Peak) | <10% |
| Avg Session | 5–8 min | <3 min |
| Monthly Churn | <5% | >15% |
| Einmal-Tier-Besitzer | >95% | <80% |

---

## 🚀 Implementation-Prioritäten

### Must-Have (Q3 2026)

- [x] Newcomer Onboarding Strategy dokumentiert
- [x] Retention Strategy dokumentiert
- [ ] Progressive Feature-Unlock im Code (GameView)
- [ ] Push-Notif für Churn-Risikogruppen
- [ ] Boss-Fight Weekly Rotation

### Nice-to-Have (Q4 2026)

- [ ] Friend-Leaderboard
- [ ] World-Bots bei <10 Online
- [ ] Event-Calendar Automation
- [ ] A/B Testing Framework

### Can-Wait (Q1 2027)

- [ ] Analytics Dashboard (Churn-Forecasting)
- [ ] Adaptive Difficulty (Quests)
- [ ] New Minigame (TBD)

---

## 📝 Contributing to These Docs

Wenn du eine neue Feature entwickelst:

1. **Füge einen Absatz zu Feature Integration Guide hinzu** (wo passt die Feature? Early/Mid/Late-Game?)
2. **Aktualisiere Feature-Abhängigkeitsdiagramm** (was braucht die Feature?)
3. **Schlage Churn-Mitigationen vor** (wie verhinderst du, dass die Feature Spieler verschreckt?)
4. **Trage zur Retention Doc bei**, wenn neue Loops entstehen

Wenn du ein Problem siehst (z. B. DAU-Drop):

1. **Log deine Beobachtung** (welche Metrik, auf welche Gruppe)
2. **Quercheck mit den Docs** (ist das eine bekannte Risiko?)
3. **Öffne einen PR** mit deinem Fix

---

## 📞 Kontakt & Fragen

Für Fragen zu diesen Strategien:
- **Technisch (Code):** Siehe `AGENTS.md` und `CLAUDE.md`
- **Balancing:** Siehe `docs/superpowers/specs/` für Feature-Details
- **Live-Ops:** Nutze diese Docs als Grundlage für Content-Kalender

---

**Letzter Update:** 2026-09-16  
**Nächster Review:** 2026-10-16 (monatlich)
