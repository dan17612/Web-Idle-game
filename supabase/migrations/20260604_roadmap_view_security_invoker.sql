-- 20260604_roadmap_view_security_invoker.sql
-- Sicherheits-Fix: roadmap_view als SECURITY INVOKER definieren, damit die View
-- die RLS-Policies des abfragenden Nutzers durchsetzt statt die des View-Erstellers.
-- Behebt den Supabase-Advisor "security_definer_view" für public.roadmap_view.

alter view public.roadmap_view set (security_invoker = on);
