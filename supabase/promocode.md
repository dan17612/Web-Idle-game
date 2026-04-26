# Promo-Codes

Diese Datei dokumentiert Beispiel-Codes für die Tabelle `public.promo_codes`.
Jeder Code kann pro Benutzer nur einmal eingelöst werden, außer es ist anders angegeben.

## Übersicht

| Code | Belohnung | Limit |
| --- | --- | --- |
| `STARTER` | 1× normaler Hase und 5000 Coins | 1× pro Benutzer |
| `GOLDPIG` | 1× Gold-Schwein und 10 Tickets | 1× pro Benutzer |
| `ZOO50TAPS` | 50 Bonus-Taps | 1× pro Benutzer |
| `BOOST` | 5× Diamant-Huhn, 3× Pet-Boost für 30 Minuten und 2500 Coins | 100 Einlösungen total, 1× pro Benutzer, läuft nach 7 Tagen ab |

## SQL

```sql
-- Code "STARTER" → 1× Hase + 5000 Coins
insert into public.promo_codes(code, rewards, max_uses_per_user, note)
values (
  'STARTER',
  '{"coins": 5000, "species": "rabbit", "tier": "normal", "qty": 1, "note": "Willkommens-Hase 🐰"}'::jsonb,
  1,
  'Onboarding-Code'
);

-- Code "GOLDPIG" → 1× Gold-Schwein + 10 Tickets
insert into public.promo_codes(code, rewards, max_uses_per_user)
values (
  'GOLDPIG',
  '{"species": "pig", "tier": "gold", "qty": 1, "tickets": 10}'::jsonb,
  1
);

-- Code "ZOO50TAPS" → wie Newbie-Gift: 50 Bonus-Taps
insert into public.promo_codes(code, rewards, max_uses_per_user, note)
values (
  'ZOO50TAPS',
  '{"bonus_taps": 50, "note": "50 Extra-Taps gratis"}'::jsonb,
  1,
  'Newbie-Gift Variante'
);

-- Code "BOOST" → 5 Hühner Diamant + ×3 Pet-Boost für 30 Min + 2500 Coins, 100 Einlösungen total
insert into public.promo_codes(code, rewards, max_uses, max_uses_per_user, expires_at)
values (
  'BOOST',
  '{"coins": 2500, "species": "chicken", "tier": "diamond", "qty": 5, "pet_boost_multiplier": 3, "pet_boost_minutes": 30}'::jsonb,
  100, 1,
  now() + interval '7 days'
);
```

## Hinweise

- `rewards` ist ein `jsonb`-Objekt und kann mehrere Belohnungen kombinieren.
- `max_uses_per_user` begrenzt die Einlösung pro Benutzer.
- `max_uses` begrenzt die gesamte Anzahl aller Einlösungen.
- `expires_at` setzt ein Ablaufdatum für zeitlich begrenzte Codes.