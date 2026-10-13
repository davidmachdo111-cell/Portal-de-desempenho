-- ====================================================================
-- EVOLUÇÃO ESTRUTURAL — PORTAL DE DESEMPENHO (SIMULAÇÃO E CHECKLISTS DINÂMICOS)
-- ====================================================================

-- 1. Status do Colaborador
DO $$ BEGIN
    CREATE TYPE collaborator_status_type AS ENUM ('novo', 'em_treinamento', 'aprovado', 'necessita_reforco');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Status do Checklist Atribuído
DO $$ BEGIN
    CREATE TYPE collaborator_checklist_status_type AS ENUM ('pendente', 'em_andamento', 'concluido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabela collaborators (Colaboradores em Treinamento)
CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    registration_code TEXT,
    team_cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
    role_title TEXT NOT NULL DEFAULT 'Analista de Relacionamento',
    status collaborator_status_type NOT NULL DEFAULT 'novo',
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela checklists (Modelos de Checklists Dinâmicos)
CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Atendimento',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela exercises (Exercícios / Cenários de Treinamento com "Cliente")
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_profile TEXT NOT NULL,
    scenario_instructions TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela checklist_exercises (Vínculo Checklist <-> Exercícios)
CREATE TABLE IF NOT EXISTS public.checklist_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 1,
    CONSTRAINT unique_checklist_exercise UNIQUE (checklist_id, exercise_id)
);

-- 7. Tabela criteria (Critérios Institucionais)
CREATE TABLE IF NOT EXISTS public.criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    section_name TEXT NOT NULL DEFAULT 'Geral',
    name TEXT NOT NULL,
    description TEXT,
    weight NUMERIC NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela checklist_criteria (Vínculo Checklist <-> Critérios Avaliados com Peso)
CREATE TABLE IF NOT EXISTS public.checklist_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
    weight NUMERIC NOT NULL DEFAULT 1,
    CONSTRAINT unique_checklist_criterion UNIQUE (checklist_id, criterion_id)
);

-- 9. Tabela collaborator_checklists (Atribuição do Checklist ao Colaborador com Rastreabilidade de Instrutor e Ator)
CREATE TABLE IF NOT EXISTS public.collaborator_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE RESTRICT,
    instructor_auxiliar_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_auxiliar_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status collaborator_checklist_status_type NOT NULL DEFAULT 'pendente',
    final_score NUMERIC(5,2),
    criteria_answers JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collaborators_read" ON public.collaborators FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "collaborators_manage" ON public.collaborators FOR ALL USING (public.check_user_permission('can_manage_collaborators'));

CREATE POLICY "checklists_read" ON public.checklists FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "checklists_manage" ON public.checklists FOR ALL USING (public.check_user_permission('can_manage_checklists'));

CREATE POLICY "exercises_read" ON public.exercises FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "exercises_manage" ON public.exercises FOR ALL USING (public.check_user_permission('can_manage_exercises'));

CREATE POLICY "evaluations_read" ON public.collaborator_checklists FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "evaluations_apply" ON public.collaborator_checklists FOR ALL USING (public.check_user_permission('can_apply_evaluations'));
