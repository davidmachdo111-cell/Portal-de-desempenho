-- 20261013_corporate_auth_approval_workflow.sql
-- Migração: Novo Sistema de Autenticação Corporativa baseada em Usuário (nome.sobrenome),
-- Fila de Aprovação por Administrador e Restrição de Troca de Senha.

-- 1. Criação do tipo ENUM de status de usuário se não existir
DO $$ BEGIN
    CREATE TYPE user_status_type AS ENUM (
        'pendente_aprovacao',
        'aprovado_sem_senha',
        'ativo',
        'bloqueado'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Garantir tipo de perfil institucional (role)
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('admin', 'avaliador', 'auxiliar');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Atualização / Adequação da tabela profiles com os campos requeridos
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS status user_status_type NOT NULL DEFAULT 'pendente_aprovacao',
    ADD COLUMN IF NOT EXISTS can_change_password BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 4. Função para garantir que username seja sempre armazenado em minúsculas
CREATE OR REPLACE FUNCTION public.format_username_lowercase()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.username IS NOT NULL THEN
        NEW.username := LOWER(TRIM(NEW.username));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_format_username_lowercase ON public.profiles;
CREATE TRIGGER trg_format_username_lowercase
    BEFORE INSERT OR UPDATE OF username ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.format_username_lowercase();

-- 5. Seed Inicial: Acesso Mestre do Administrador (david.furtado)
-- Cria o primeiro administrador com status 'aprovado_sem_senha' para que no primeiro acesso ele possa cadastrar sua senha
INSERT INTO public.profiles (
    id,
    username,
    full_name,
    email,
    role,
    status,
    is_active,
    can_change_password,
    individual_permissions,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'david.furtado',
    'David Furtado',
    'david.furtado@portaldesempenho.corp',
    'admin',
    'aprovado_sem_senha',
    true,
    true,
    ARRAY[
        'can_manage_collaborators',
        'can_manage_checklists',
        'can_manage_exercises',
        'can_apply_evaluations',
        'users:manage',
        'cells:manage'
    ],
    NOW(),
    NOW()
)
ON CONFLICT (username) DO UPDATE
SET
    role = 'admin',
    status = 'aprovado_sem_senha',
    can_change_password = true,
    full_name = 'David Furtado';
