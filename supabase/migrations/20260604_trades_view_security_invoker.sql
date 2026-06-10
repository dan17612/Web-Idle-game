-- 20260604_trades_view_security_invoker.sql
-- Sicherheits-Fix: trades_view erneut als SECURITY INVOKER definieren.
-- 20260603_05_trade_eggs hat die View neu erstellt und dabei die security_invoker-Option
-- verloren -- dadurch umging die View die RLS von public.trades und private Trades aller
-- Nutzer (Tiere, Eier, Coins) wurden für jeden sichtbar.
-- Stellt die RLS-Durchsetzung des abfragenden Nutzers wieder her (Advisor: security_definer_view).

alter view public.trades_view set (security_invoker = on);
