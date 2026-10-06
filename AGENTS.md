# Zoo Empire — Leitfaden für KI-Agenten

Idle-Game (Vue 3 SPA + Supabase), in dem Spieler Zoo-Tiere sammeln, ausrüsten
und über Minispiele Coins/Tickets verdienen. Dieser Leitfaden fasst zusammen,
was ein Agent wissen muss, bevor er Code anfasst.

## Stack & Kommandos

- Vue 3 (`<script setup>`, JS — **kein TypeScript**), Pinia, vue-router
  (Hash-History), PrimeVue 4 (Aura, Dark über `.app-dark`), Three.js (nur Minispiele/Welt),
  Capacitor 8 (Android), Vite.
- Backend: Supabase (Projekt-ID `rkskpvbismdlsevaqoer`, eu-north-1).
- `npm run dev` — Dev-Server (Preview-Browser hat eine eingeloggte Test-Session;
  Views direkt per Hash-Route ansteuerbar, z. B. `#/world`).
- `npm test` — `node --test` über alle `src/*.test.js` (reine Logik + SQL-Regex-Tests).
- `npm run build` — Vite-Build (muss vor Abschluss grün sein).

## Architektur-Konventionen

- **Server-autoritative Wirtschaft:** Alles mit Coins/Tickets/Tieren läuft über
  Postgres-RPCs (`security definer set search_path = public`, Grants nur für
  `authenticated`, `revoke ... from anon, public`). Der Client rechnet nie
  selbst: Antworten liefern absolute `coins`/`tickets` + `server_now`.
- **RPC-Muster im Client:** vor Käufen `await game.persist()`, dann
  `supabase.rpc('name', { p_* })`, danach `game.coins = Number(data.coins)` und
  `serverOffset = new Date(data.server_now).getTime() - Date.now()`.
- **Reward-Spiegel:** Belohnungsformeln existieren doppelt — SQL-Funktion
  (z. B. `_parkour_reward`) und Client-Vorschau (z. B. `parkourReward()` in der
  View). Bei Balance-Änderungen immer beide Seiten synchron ändern.
- **Migrationen:** eine Datei pro Feature unter `supabase/migrations/`
  (`YYYYMMDD_feature.sql`), angewendet zusätzlich via MCP `apply_migration`.
  Jede neue Tabelle: RLS an, Policies nur Select, Schreiben über RPCs.
  Achtung: Views nach Neuaufbau wieder `security_invoker` setzen.
- **Tests:** reine Logikmodule (`src/foo.js`) bekommen `src/foo.test.js`;
  Migrationen bekommen `src/fooSql.test.js` mit Regex-Prüfungen auf RLS,
  Revokes, search_path-Pins und Formeln (Vorlage: `src/wordleSql.test.js`).
- **Routen:** flach, lazy, `meta: { auth: true }` in `src/router.js`;
  Minispiele/Features als eigene Top-Level-Route (`/drift`, `/parkour`,
  `/wordle`, `/world`).
- **Einstiege in GameView:** Jedes Feature bekommt eine Quick-Action-Kachel
  (`.qa-btn`) und einen Full-Width-Kartenlink (Muster `.parkour-link`).

## UI & Design-System („Toy Look")

- Tokens in `src/styles.css:1-44`: `--bg #fdf2d9`, `--card`, `--accent #f4a912`,
  `--accent-2`, `--purple`, `--danger`, `--border`, `--radius: 22px`,
  `--space-1..6`, `--safe-top/--safe-bot` (`env(safe-area-inset-*)`).
  Keine Navy-Hexcodes; immer Tokens verwenden.
- **Dark Mode (Discord-Look)**: `html.app-dark` in `src/styles.css:46-93`
  überschreibt die Tokens (Grau `#313338/#2b2d31/#1e1f22`) und PrimeVues
  Surface-Skala. Umschalter in Settings (`System/Hell/Dunkel`,
  `src/theme.js` + `composables/useTheme.js`, Pre-Paint in `index.html`).
  Neue Farben daher nie hart hell (`#fff`, `rgba(255,255,255,.9)`, Cremetöne)
  auf Flächen mit `var(--heading)`-Text setzen — Tokens nutzen
  (`--mix-base` statt `#fff` in `color-mix`, `--success-ink`, `--info-ink`,
  `--overlay`, `--accent-shade` für Button-Schatten) oder am Ende des
  Scoped-Styles `.app-dark .klasse { … }` ergänzen.
  Spec: `docs/superpowers/specs/2026-09-27-dark-mode-eier-maschine-design.md`.
- Chunky Buttons: `.btn` (Gold-Gradient, harter Bottom-Shadow), Varianten
  `.secondary`, `.danger`, `.btn-ghost`, `.full`. PrimeVue-Komponenten (Button,
  InputText, Select, Toast …) sind global registriert — nicht importieren.
- App-Shell max. 560px breit; Fullscreen-Spiele als Teleport-Overlay
  (`position: fixed; inset: 0; touch-action: none`), HUD mit
  `padding: calc(8px + var(--safe-top))`, Steuerelemente mit
  `bottom: calc(14px + var(--safe-bot))`.
- **i18n:** de/en/ru. Neuere Feature-Views halten ein lokales `I18N`-Dict +
  `tx(key, vars)`-Helfer (Vorlage `ParkourGameView.vue`); globale Keys liegen in
  `src/i18n.js`. Deutsch immer mit echten Umlauten (ä ö ü ß).
- Feedback über `useAppToast()` (`ok/err/info`), Reload nach App-Rückkehr über
  `useReturnRefresh(loader)`, Busy-Zustände als String-Ref `busyKey`.

## 3D-Features (Three.js)

- Engine als framework-freie Klasse (Vorlagen `src/parkourEngine.js`,
  `src/worldEngine.js`): `constructor(canvas, callbacks)`, `async init()` mit
  dynamischem `import('three')` (Code-Splitting), `resize(w,h)`, `dispose()`
  mit `_track()`/`_disposables` + `renderer.forceContextLoss()` — kein
  WebGL-Leak. Pixel-Ratio ≤ 2, InstancedMesh für Wiederholtes, keine
  Echtzeit-Schatten (Blob-Shadows).
- View-Muster: Engine in nicht-reaktiver `let`-Variable, `await nextTick()`
  vor Erzeugung, Guard nach `await init()`, `dispose()` in `onUnmounted`.

## Zoo-Welt (`/world`) — Spezialwissen

Spec: `docs/superpowers/specs/2026-08-03-zoo-welt-design.md`.

- `src/world.js` = reine Logik (Ring-Layout der Farm-Bauplätze, Collider,
  Zonen, Katalog-Visual-Fallbacks, `FOUNTAIN_REWARD`-Spiegel von
  `world_fountain_claim`). `src/worldEngine.js` = Rendering.
  `WorldView.vue` = HUD/Realtime/RPCs. `VirtualJoystick.vue` = Touch-Joystick.
- DB: `world_state` (Position, Bauplatz aus `world_plot_seq`, Kosmetik),
  `world_items` (Katalog; `cost = 0` ⇒ alle besitzen es), `world_purchases`.
  RPCs: `world_enter`, `world_save_pos` (Clamp ±95), `world_buy_item`,
  `world_equip`, `world_set_leash`, `world_fountain_claim` (1×/UTC-Tag),
  `world_players` (aktive Spieler + ausgerüstete Tiere).
- Realtime: Kanal `world:lobby` — Presence (Key = User-ID, Payload =
  Erscheinungsbild) + Broadcast `pos` (~7 Hz nur bei Bewegung) und `emote`.
  Positionen sind Kosmetik; Realtime nie als Wirtschaftsquelle verwenden.
- Supabase-JS-Falle: `supabase.rpc(...)` ist lazy (thenable) — Fire-and-forget
  braucht `.then(null, () => {})`, sonst wird die Query **nie ausgeführt**
  (`.catch?.()` startet sie nicht).

## Zoo-Börse (`/market`) — Spezialwissen

Spec: `docs/superpowers/specs/2026-09-24-tier-boerse-design.md`.

- Marktwert pro `(species, tier)` = Basiswert × Stufe × (1 + 3 · Seltenheit ·
  (1 − Beschaffbarkeit)), danach geklemmter Mix mit Trade-Medianen (7 Tage).
  Formel doppelt: `_market_model`/`_market_values` (SQL) und `src/market.js`;
  `src/marketSql.test.js` vergleicht die Konstanten.
- Nur Spieler-zu-Spieler: `market_list` (Angebot), `market_buy` (annehmen),
  `market_cancel`. Angebote sperren das Tier nicht — gültig ist ein Angebot nur,
  solange `_market_listing_ok` gilt (Besitz, nicht ausgerüstet/upgradend/brütend).
- Kursverlauf: `market_snapshots`, stündlich lazy aus `market_overview()`;
  Sparklines = 28 Punkte im 6-h-Raster (Portfolio-Summe clientseitig).
- Neue Tierquellen (Truhe, Ei, Zucht, Crafting) sollten in `_market_model`
  als Beschaffbarkeit auftauchen, sonst gilt die Art als Limited Edition.

## Support-Tab (`/support`) — Spezialwissen

Spec: `docs/superpowers/specs/2026-09-28-support-tab-roadmap-downvotes-design.md`.

- Nav-Tab „💬 Support“ mit zwei Reitern (`?tab=chat|roadmap`, Standard Chat);
  `/roadmap` leitet auf `/support?tab=roadmap` um.
- Support-Chat (`SupportChat.vue`, Logik `src/supportChat.js`): ein Gespräch =
  ein Support-Ticket; Betreff wird aus Kategorie + erster Zeile gebaut, Antworten
  über `user_reply_support_ticket`, Polling 15 s (keine Realtime-Publikation).
  Admin antwortet weiter im AdminModal → Tickets.
- Roadmap (`RoadmapBoard.vue`, Logik `src/roadmap.js`): Up-/Downvotes über
  `vote_idea(p_idea_id, p_value)` (±1, gleiche Richtung = zurückziehen);
  `roadmap_view.vote_count` = Score, `my_value` = eigene Stimme. Standardfilter „Ideen“.
- Rollen: Sub-Admins dürfen **nur** Spieler sperren (`admin_list_users`,
  `admin_set_user_ban`) und Tickets bearbeiten; alle anderen Admin-RPCs prüfen
  `role is distinct from 'admin'`. Antworten speichern `sender_name`/`sender_role`
  (Anzeige im Chat). Neue Admin-RPCs standardmäßig admin-only anlegen.

## Autoklicker-Erkennung — Spezialwissen

Spec: `docs/superpowers/specs/2026-10-06-autoklicker-erkennung-design.md`.

- Zählung über **Trigger** (nicht in den RPCs): `profiles.taps_used`↑,
  `chest_purchases`, `ticket_chest_purchases`, `shop_purchases` →
  `_automation_track()` → `automation_slots` (pro Spieler × 5-Min-Slot).
  Regeln (Dauerlauf 94/96 Slots in 8 h, Takt σ < 1 s über 25 Slots,
  Klickmuster per Client-Meldung) laufen nur bei der ersten Aktion eines Slots.
- Schwellen doppelt: `_automation_rules()` (SQL) ↔ `AUTOMATION_RULES` in
  `src/automationCheck.js`; `src/automationSql.test.js` vergleicht beide.
- Offene Prüfung ⇒ Trigger werfen `automation_check_required` (ganze
  Transaktion rollt zurück). **Keine automatische Sperre**: Der Spieler tippt
  den 4-stelligen Code (`automation_verify`), der Admin entscheidet im
  automatisch eröffneten Support-Ticket.
- Neue Truhen-/Klick-Quellen: Trigger auf deren Kauf-Tabelle ergänzen und im
  Client bei Fehlern `game.noteAutomationError(err)` aufrufen. `useAppToast().err`
  verschluckt Lock-Fehler, weil das globale `AutomationCheckModal` sie erklärt.

## Stolperfallen

- `main.js` blockt Pinch/Double-Tap global — eigene Touch-Flächen brauchen
  `touch-action: none` + Pointer-Capture (siehe `VirtualJoystick.vue`).
- `locale` ist ein ref aus `src/i18n.js`; `tx()`/`t()` im Template aufrufen,
  damit Sprachwechsel re-rendert.
- Countdown/Zeit immer über `Date.now() + game.serverOffset`, nie lokale Uhr.
- Intervalle nur bei `document.visibilityState === 'visible'` ticken lassen.
- `species_costs.enabled=false` ⇒ nicht in Shop-Rotation; `shop_visible=false`
  ⇒ zusätzlich im Frontend versteckt (Craft-only-Spezies).

## Weitere Dokumentation

- Design-Specs: `docs/superpowers/specs/` (eine pro Feature, vor der
  Implementierung committen — gleiche Reihenfolge auch für neue Features).
- Pläne: `docs/superpowers/plans/`.
