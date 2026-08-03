# Zoo-Welt — begehbare 3D-Lobby mit Multiplayer

## Ziel
Eine mobile-freundliche, begehbare 3D-Welt (Three.js) als sozialer Hub: Spieler
laufen mit einem Touch-Joystick über einen zentralen Platz, sehen andere Spieler
live (Supabase Realtime), besuchen den Kosmetik-Shop, fahren Autos, führen ein
ausgerüstetes Tier an der Leine und besichtigen die Farmen aller Spieler, die
außerhalb des Platzes liegen. Jeder Spieler bekommt automatisch eine
Starter-Farm (Skin „Blumenwiese") mit festem Bauplatz.

## Gameplay
- **Steuerung:** Virtueller Joystick unten links (Pointer-Events, Pointer-Capture),
  WASD/Pfeiltasten am Desktop. Kamera folgt in fester Third-Person-Perspektive
  (kein Kamera-Drehen — Joystick-oben = Bildschirm-oben, mobil am einfachsten).
- **Platz (Lobby):** Brunnen in der Mitte, Shop-Gebäude, Zoo-Tor (zurück zum
  klassischen Zoo `/`), Laternen/Deko. Kollision über einfache Kreis-Collider.
- **Multiplayer:** Andere Spieler erscheinen live mit Username-Schild,
  Avatar-Emoji-Gesicht, Outfit, Auto und Leinen-Tier. Emote-Knopf sendet
  Emoji-Sprechblasen (👋 ❤️ 😂 🎉 😮 🚗📢-Hupe im Auto).
- **Farmen:** Ringförmig außerhalb des Platzes, ein Bauplatz pro Spieler
  (Sequenz-Nummer, deterministisches Ring-Layout im Client). In jeder Farm
  laufen die ausgerüsteten Tiere des Besitzers als Emoji-Billboards umher;
  Schild mit Username. Farm-Skin (Boden, Zaun, Deko) ist kaufbar.
- **Auto:** Im Shop kaufbar, per Knopf auf-/absteigen, ~2–2,8× Lauftempo.
  Leinen-Tier hüpft aufs Autodach. Hupen-Emote nur im Auto.
- **Leine:** Aus den ausgerüsteten Tieren eines wählen; es folgt an einer
  gezeichneten Leine (Three.Line) mit Federung.
- **Brunnen-Münze:** Einmal täglich am Brunnen eine Münze werfen →
  +25.000 🪙 und +1 🎟 (server-validiert, UTC-Tag).

## Realtime & Koordinaten
- Kanal `world:lobby` mit **Presence** (Key = User-ID, Payload = Erscheinungsbild:
  Username, Avatar, Outfit, Auto, Leine) und **Broadcast** `pos`
  (~8 Hz nur bei Bewegung, {x, z, vx, vz, driving}) + `emote`.
  Entfernte Spieler werden per Velocity-Extrapolation + Lerp interpoliert.
- Koordinaten werden zusätzlich in Supabase persistiert (`world_state.x/z`,
  alle ~4 s bei Bewegung + beim Verlassen) — beim Betreten sieht man zuletzt
  aktive Spieler an ihrer letzten Position, live sobald sie sich bewegen.
- Realtime ist nur Transport für Kosmetik; alles mit Wirtschaftsbezug
  (Käufe, Brunnen) läuft server-autoritativ über RPCs.

## Shop (Kosmetik, alles Coins)
| Kategorie | Items (Kosten) |
|---|---|
| Outfits | Standard (0) · Farmer 25k · Sport 100k · Ranger 500k · Pirat 2M · Zauberer 10M · Königlich 50M · Roboter 250M · Dino 1Mrd |
| Autos | Rotes Kart 250k (2,0×) · Blauer Flitzer 1M (2,2×) · Safari-Jeep 10M (2,4×) · Gold-Renner 500M (2,8×) |
| Farm-Skins | Blumenwiese (0, Starter) · Wüste 500k · Winter 2M · Dschungel 20M · Zuckerland 100M · Weltraum 1Mrd |

Items mit Kosten 0 gelten als von allen besessen. Katalog liegt in der DB
(`world_items`), die visuelle Umsetzung (Farben, Hüte, Deko-Emojis) im Client
(`src/world.js`) mit Fallback für unbekannte IDs.

## Datenmodell (Migration `20260803_world_lobby.sql`)
- `world_state` — user_id PK→profiles, x, z, plot (unique, aus Sequenz
  `world_plot_seq`), outfit, car, farm_skin, leash_species,
  fountain_last_claim date, last_seen. RLS: Select für authenticated,
  Schreiben nur über RPCs.
- `world_items` — id, kind (outfit|car|farm_skin), name, emoji, cost, sort,
  enabled, meta jsonb. RLS: Select für authenticated.
- `world_purchases` — (user_id, item_id) PK. RLS: Self-Select.

### RPCs (alle security definer, search_path=public, nur authenticated)
- `world_enter()` — legt world_state an (Plot aus Sequenz), gibt eigenen
  Zustand + gekaufte Item-IDs + fountain_available + server_now zurück.
- `world_save_pos(p_x, p_z)` — clampt auf ±95, aktualisiert last_seen.
- `world_buy_item(p_item_id)` — prüft enabled/cost>0/nicht besessen/Guthaben,
  zieht Coins ab, gibt {coins, server_now} zurück.
- `world_equip(p_kind, p_item_id)` — prüft Besitz (oder cost=0; Auto darf null
  sein zum Absteigen), setzt outfit/car/farm_skin.
- `world_set_leash(p_species)` — null oder Species eines ausgerüsteten Tieres.
- `world_fountain_claim()` — 1×/UTC-Tag, +25.000 Coins +1 Ticket,
  Client-Vorschau spiegelt die Beträge (Konstanten synchron halten!).
- `world_players(p_limit default 60)` — aktive Spieler (last_seen ≤ 14 Tage,
  eigener immer dabei): Profil, Plot, Skin, Position, Outfit + bis zu 8
  ausgerüstete Tiere (Species/Tier/Emoji via species_costs).

## Architektur
| Datei | Zweck |
|---|---|
| `src/world.js` | Reine Logik: Konstanten, Ring-Layout `plotPosition()`, Collider + `resolveCollision()`, `clampToWorld()`, Zonen-Erkennung `nearestZone()`, Katalog-Visuals mit Fallbacks, Brunnen-Vorschau. Unit-testbar. |
| `src/world.test.js` | Tests: Plot-Layout kollisionsfrei/deterministisch, Clamp, Collider, Zonen, Visual-Fallbacks. |
| `src/worldSql.test.js` | Regex-Tests der Migration (RLS, Revokes, search_path, Tages-Guard) nach `wordleSql.test.js`-Vorlage. |
| `src/worldEngine.js` | Three.js-Engine nach ParkourEngine-Muster: dynamischer `import('three')`, `dispose()`-Hygiene, Chase-Cam, Spieler-/Remote-/Farm-Rendering, Emoji-Sprites via CanvasTexture. API: `setInput`, `upsertRemote/moveRemote/removeRemote`, `setAppearance`, `setEmote`, `setFarms`, `onZone`. |
| `src/components/VirtualJoystick.vue` | Touch-Joystick (Pointer-Capture, normierter Vektor, Safe-Area-Position). |
| `src/views/WorldView.vue` | Fullscreen-Overlay (Teleport, wie Parkour), HUD (Coins, Online-Zähler, Zurück), Joystick, Aktions-Knopf (Zone), Auto/Leine/Emote-Knöpfe, Shop-Sheet (Tabs Outfits/Autos/Farmen), Farm-Plakette, Onboarding (localStorage), lokales I18N de/en/ru + `tx()`. |
| `src/router.js` | Route `/world` (lazy, auth). |
| `src/views/GameView.vue` | Hero-Kartenlink + Quick-Action „Zoo-Welt" (Muster Parkour-Link). |

## Fehlerfälle
- WebGL-Init schlägt fehl → Toast + zurück zur klassischen Ansicht.
- Channel-Fehler/Resume → Re-Subscribe via `useReturnRefresh`/`onAppResume`,
  Spielerliste wird über `world_players` neu geladen.
- RPC-Fehler → `useAppToast().err`, Busy-Flags gegen Doppelkäufe.

## Performance (Mobile)
Pixel-Ratio ≤ 2, keine Echtzeit-Schatten (Blob-Shadows), Fog, InstancedMesh für
Zäune/Deko, max. 24 gerenderte Remote-Spieler (nächste zuerst), ≤ 8 Tiere pro
Farm, Loop pausiert bei verstecktem Tab, komplettes `dispose()` beim Verlassen.
