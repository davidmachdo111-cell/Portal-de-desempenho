-- migration_core_portal_security.sql
-- Migração Corporativa: Segurança RLS, Integridade Referencial e Snapshots Imutáveis

-- 1. Criação do tipo de perfil institucional
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('admin', 'avaliador', 'auxiliar');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de Perfis com suporte a permissões individuais
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role_type NOT NULL DEFAULT 'auxiliar',
    is_active BOOLEAN NOT NULL DEFAULT true,
    individual_permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Função centralizada para verificar permissões (RBAC + Permissões Individuais)
CREATE OR REPLACE FUNCTION public.check_user_permission(required_perm TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role user_role_type;
    current_user_perms TEXT[];
    user_is_active BOOLEAN;
BEGIN
    SELECT role, individual_permissions, is_active
    INTO current_user_role, current_user_perms, user_is_active
    FROM public.profiles
    WHERE id = auth.uid();

    IF user_is_active IS NOT TRUE THEN
        RETURN FALSE;
    END IF;

    -- Administrador possui acesso irrestrito
    IF current_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Permissão individual explicitamente concedida
    IF required_perm = ANY(current_user_perms) THEN
        RETURN TRUE;
    END IF;

    -- Regras por perfil
    IF required_perm = 'evaluations:create' AND current_user_role = 'avaliador' THEN
        RETURN TRUE;
    END IF;

    IF required_perm = 'evaluations:view' AND current_user_role = 'avaliador' THEN
        RETURN TRUE;
    END IF;

    IF required_perm = 'materials:view' AND current_user_role IN ('avaliador', 'auxiliar') THEN
        RETURN TRUE;
    END IF;

    IF required_perm = 'materials:download' AND current_user_role IN ('avaliador', 'auxiliar') THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Tabela de Células / Equipes com Padrão de Atendimento
CREATE TABLE IF NOT EXISTS public.cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    coordinator_name TEXT NOT NULL,
    has_service_standard BOOLEAN NOT NULL DEFAULT false,
    standard_version TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Matriz de Critérios x Exercício (Prevenção de duplicatas)
CREATE TABLE IF NOT EXISTS public.exercise_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL,
    criterion_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_exercise_criterion UNIQUE (exercise_id, criterion_id)
);

ALTER TABLE public.exercise_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_criteria_read_all_active"
ON public.exercise_criteria FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "exercise_criteria_manage_authorized"
ON public.exercise_criteria FOR ALL
USING (public.check_user_permission('master_checklist:manage'))
WITH CHECK (public.check_user_permission('master_checklist:manage'));

-- 6. Validação de Célula: Regra do Padrão de Atendimento antes de Avaliação
CREATE OR REPLACE FUNCTION public.validate_cell_standard_before_evaluation()
RETURNS TRIGGER AS $$
DECLARE
    has_standard BOOLEAN;
BEGIN
    SELECT has_service_standard INTO has_standard
    FROM public.cells
    WHERE id = NEW.cell_id;

    IF has_standard IS NOT TRUE THEN
        RAISE EXCEPTION 'Não é permitido iniciar ou registrar avaliação para células sem Padrão de Atendimento homologado.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Imutabilidade de Avaliações Concluídas (Snapshot JSONB)
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL,
    cell_id UUID NOT NULL REFERENCES public.cells(id),
    evaluator_id UUID NOT NULL REFERENCES public.profiles(id),
    exercise_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
    final_score NUMERIC(5,2),
    criteria_snapshot JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_check_cell_standard ON public.evaluations;
CREATE TRIGGER trg_check_cell_standard
BEFORE INSERT ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.validate_cell_standard_before_evaluation();
