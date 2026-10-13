-- ====================================================================
-- EVOLUÇÃO ESTRUTURAL DEFINITIVA — PORTAL DE DESEMPENHO (NOVA ARQUITETURA MODULAR)
-- ====================================================================

-- 1. Categorias Padronizadas
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'geral' CHECK (type IN ('checklist', 'exercise', 'geral')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Personagens / Banco de Clientes Independentes
CREATE TABLE IF NOT EXISTS public.characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age TEXT NOT NULL,
    temperament TEXT NOT NULL,
    history TEXT,
    objectives TEXT,
    typical_phrases TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Exercícios e Cenários de Treinamento
CREATE TABLE IF NOT EXISTS public.exercises (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    scenario_instructions TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Vínculo N:M entre Exercícios e Personagens (até 4 por exercício)
CREATE TABLE IF NOT EXISTS public.exercise_characters (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_exercise_character UNIQUE (exercise_id, character_id)
);

-- 5. Modelos de Checklists Flexíveis (com ou sem exercícios simulados)
CREATE TABLE IF NOT EXISTS public.checklists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    has_exercises BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Vínculo N:M Opcional entre Checklists e Exercícios
CREATE TABLE IF NOT EXISTS public.checklist_exercises (
    id TEXT PRIMARY KEY,
    checklist_id TEXT NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_checklist_exercise UNIQUE (checklist_id, exercise_id)
);

-- 7. Critérios Avaliados do Checklist
CREATE TABLE IF NOT EXISTS public.checklist_criteria (
    id TEXT PRIMARY KEY,
    checklist_id TEXT NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight NUMERIC NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Colaboradores em Treinamento
CREATE TABLE IF NOT EXISTS public.collaborators (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    cell_team TEXT NOT NULL,
    registration_code TEXT,
    status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_treinamento', 'aprovado', 'necessita_reforco')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Atribuição de Checklists e Histórico de Avaliações
CREATE TABLE IF NOT EXISTS public.collaborator_checklists (
    id TEXT PRIMARY KEY,
    collaborator_id TEXT NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    checklist_id TEXT NOT NULL REFERENCES public.checklists(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    final_score NUMERIC,
    criteria_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructor_auxiliar_id TEXT,
    actor_auxiliar_id TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Segurança Básica
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Autenticado Leitura Geral" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Acesso Autenticado Leitura Personagens" ON public.characters FOR SELECT USING (true);
CREATE POLICY "Acesso Autenticado Leitura Exercicios" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Acesso Autenticado Leitura Checklists" ON public.checklists FOR SELECT USING (true);
CREATE POLICY "Acesso Autenticado Leitura Colaboradores" ON public.collaborators FOR SELECT USING (true);
CREATE POLICY "Acesso Autenticado Leitura Avaliacoes" ON public.collaborator_checklists FOR SELECT USING (true);
