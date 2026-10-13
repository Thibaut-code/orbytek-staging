-- À exécuter une seule fois dans l’éditeur SQL de Supabase.
-- Le thème existant reste le thème par défaut de tous les comptes.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'plombier';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_theme_check'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_theme_check
      CHECK (theme IN ('plombier', 'jardinier', 'electricien', 'peintre', 'menuisier'));
  END IF;
END $$;
