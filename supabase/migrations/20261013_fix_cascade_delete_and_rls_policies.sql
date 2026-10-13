-- ====================================================================
-- 20261013_fix_cascade_delete_and_rls_policies.sql
-- CORREÇÃO DE EXCLUSÃO DEFINITIVA EM CASCATA E POLÍTICAS DE RLS
-- ====================================================================

-- 1. Garantir colunas completas na tabela characters
ALTER TABLE public.characters
    ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Outro',
    ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS card_number TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS customer_tier TEXT DEFAULT 'Mediano',
    ADD COLUMN IF NOT EXISTS service_context TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS guide_attachment_url TEXT,
    ADD COLUMN IF NOT EXISTS guide_attachment_name TEXT;

-- 2. Garantir colunas completas na tabela exercises
ALTER TABLE public.exercises
    ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Mediano',
    ADD COLUMN IF NOT EXISTS category_name TEXT DEFAULT '';

-- 3. Garantir colunas completas na tabela checklists
ALTER TABLE public.checklists
    ADD COLUMN IF NOT EXISTS category_name TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS has_exercises BOOLEAN DEFAULT false;

-- 4. Garantir colunas completas na tabela collaborator_checklists
ALTER TABLE public.collaborator_checklists
    ADD COLUMN IF NOT EXISTS general_observations TEXT DEFAULT '';

-- 5. AJUSTAR CHAVES ESTRANGEIRAS PARA EXCLUSÃO EM CASCATA (ON DELETE CASCADE)
-- A. collaborator_checklists -> checklist_id (mudar de RESTRICT para CASCADE)
ALTER TABLE public.collaborator_checklists
    DROP CONSTRAINT IF EXISTS collaborator_checklists_checklist_id_fkey;

ALTER TABLE public.collaborator_checklists
    ADD CONSTRAINT collaborator_checklists_checklist_id_fkey
    FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;

-- B. exercise_characters -> CASCADE
ALTER TABLE public.exercise_characters
    DROP CONSTRAINT IF EXISTS exercise_characters_exercise_id_fkey,
    DROP CONSTRAINT IF EXISTS exercise_characters_character_id_fkey;

ALTER TABLE public.exercise_characters
    ADD CONSTRAINT exercise_characters_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE,
    ADD CONSTRAINT exercise_characters_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

-- C. checklist_exercises -> CASCADE
ALTER TABLE public.checklist_exercises
    DROP CONSTRAINT IF EXISTS checklist_exercises_checklist_id_fkey,
    DROP CONSTRAINT IF EXISTS checklist_exercises_exercise_id_fkey;

ALTER TABLE public.checklist_exercises
    ADD CONSTRAINT checklist_exercises_checklist_id_fkey
    FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE,
    ADD CONSTRAINT checklist_exercises_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;

-- D. checklist_criteria -> CASCADE
ALTER TABLE public.checklist_criteria
    DROP CONSTRAINT IF EXISTS checklist_criteria_checklist_id_fkey;

ALTER TABLE public.checklist_criteria
    ADD CONSTRAINT checklist_criteria_checklist_id_fkey
    FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;

-- 6. POLÍTICAS RLS COMPLETAS PARA PERMITIR SELECT, INSERT, UPDATE E DELETE
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas restritivas
DROP POLICY IF EXISTS "characters_full_access" ON public.characters;
DROP POLICY IF EXISTS "exercises_full_access" ON public.exercises;
DROP POLICY IF EXISTS "exercise_characters_full_access" ON public.exercise_characters;
DROP POLICY IF EXISTS "checklists_full_access" ON public.checklists;
DROP POLICY IF EXISTS "checklist_exercises_full_access" ON public.checklist_exercises;
DROP POLICY IF EXISTS "checklist_criteria_full_access" ON public.checklist_criteria;
DROP POLICY IF EXISTS "collaborators_full_access" ON public.collaborators;
DROP POLICY IF EXISTS "collaborator_checklists_full_access" ON public.collaborator_checklists;
DROP POLICY IF EXISTS "categories_full_access" ON public.categories;

-- Criar políticas com suporte irrestrito a DELETE / INSERT / UPDATE / SELECT para usuários da aplicação
CREATE POLICY "characters_full_access" ON public.characters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "exercises_full_access" ON public.exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "exercise_characters_full_access" ON public.exercise_characters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "checklists_full_access" ON public.checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "checklist_exercises_full_access" ON public.checklist_exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "checklist_criteria_full_access" ON public.checklist_criteria FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "collaborators_full_access" ON public.collaborators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "collaborator_checklists_full_access" ON public.collaborator_checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "categories_full_access" ON public.categories FOR ALL USING (true) WITH CHECK (true);
