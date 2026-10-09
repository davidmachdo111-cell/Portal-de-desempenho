import { PermissionKey, UserProfile, UserRole } from '../types/portal';

const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [
    'users:manage',
    'cells:manage',
    'master_checklist:manage',
    'exercises:manage',
    'characters:manage',
    'evaluations:create',
    'evaluations:view',
    'materials:view',
    'materials:download',
    'audit:view',
  ],
  avaliador: [
    'evaluations:create',
    'evaluations:view',
    'materials:view',
    'materials:download',
  ],
  auxiliar: [
    'materials:view',
    'materials:download',
  ],
};

export const ALL_PERMISSIONS_METADATA: Array<{
  key: PermissionKey;
  label: string;
  description: string;
  defaultRoles: UserRole[];
}> = [
  {
    key: 'users:manage',
    label: 'Gerenciar Usuários e Perfis',
    description: 'Criar, ativar/desativar contas, definir papéis e atribuir permissões individuais.',
    defaultRoles: ['admin'],
  },
  {
    key: 'cells:manage',
    label: 'Gerenciar Células e Padrões de Atendimento',
    description: 'Homologar ou suspender Padrão de Atendimento de células operacionais.',
    defaultRoles: ['admin'],
  },
  {
    key: 'master_checklist:manage',
    label: 'Editar Matriz do Checklist Mestre',
    description: 'Vincular ou desvincular critérios aos 10 exercícios oficiais da matriz.',
    defaultRoles: ['admin'],
  },
  {
    key: 'exercises:manage',
    label: 'Gerenciar Exercícios e Anexos',
    description: 'Criar e editar exercícios, associar múltiplos personagens e anexar PDFs.',
    defaultRoles: ['admin'],
  },
  {
    key: 'characters:manage',
    label: 'Gerenciar Catálogo de Personagens',
    description: 'Criar e atualizar personas de simulação e objeções de treinamento.',
    defaultRoles: ['admin'],
  },
  {
    key: 'evaluations:create',
    label: 'Aplicar Checklists e Avaliações',
    description: 'Iniciar, preencher e concluir avaliações de colaboradores em células homologadas.',
    defaultRoles: ['admin', 'avaliador'],
  },
  {
    key: 'evaluations:view',
    label: 'Visualizar Histórico de Avaliações',
    description: 'Consultar avaliações em andamento, concluídas e snapshots de notas.',
    defaultRoles: ['admin', 'avaliador'],
  },
  {
    key: 'materials:view',
    label: 'Visualizar Exercícios e Personagens',
    description: 'Acessar fichas de personagens, roteiros de exercícios e detalhes técnicos.',
    defaultRoles: ['admin', 'avaliador', 'auxiliar'],
  },
  {
    key: 'materials:download',
    label: 'Baixar e Imprimir PDFs Institucionais',
    description: 'Gerar URLs assinadas para download de guias em PDF e imprimir fichas.',
    defaultRoles: ['admin', 'avaliador', 'auxiliar'],
  },
  {
    key: 'audit:view',
    label: 'Consultar Logs de Auditoria',
    description: 'Inspecionar trilha de segurança, alterações de matriz e bloqueios de acesso.',
    defaultRoles: ['admin'],
  },
];

/**
 * Fonte única de verdade para verificação de autorização (espelha `public.check_user_permission` no PostgreSQL).
 * Regras:
 * 1. Se não houver usuário autenticado ou se o perfil estiver inativo (`!user.isActive`), nega tudo.
 * 2. Se for `admin`, concede acesso administrativo completo.
 * 3. Se a permissão constar em `individualPermissions`, concede o acesso específico.
 * 4. Caso contrário, verifica as permissões padrão do perfil (`role`).
 */
export function checkUserPermission(
  user: UserProfile | null | undefined,
  requiredPermission: PermissionKey
): boolean {
  if (!user || !user.isActive) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (user.individualPermissions.includes(requiredPermission)) {
    return true;
  }

  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  return roleDefaults.includes(requiredPermission);
}

export function getEffectivePermissions(user: UserProfile | null | undefined): PermissionKey[] {
  if (!user || !user.isActive) return [];
  if (user.role === 'admin') {
    return ALL_PERMISSIONS_METADATA.map((p) => p.key);
  }
  const base = new Set<PermissionKey>(ROLE_DEFAULT_PERMISSIONS[user.role] || []);
  user.individualPermissions.forEach((p) => base.add(p));
  return Array.from(base);
}
