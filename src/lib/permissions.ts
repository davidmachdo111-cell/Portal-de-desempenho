import { PermissionKey, UserProfile, UserRole } from '../types/portal';

// Por padrão:
// - admin tem controle total
// - avaliador pode conduzir avaliações e ver checklists/exercícios
// - auxiliar pode atuar como ator/instrutor e consultar exercícios
const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [
    'can_manage_collaborators',
    'can_manage_checklists',
    'can_manage_exercises',
    'can_apply_evaluations',
    'users:manage',
    'cells:manage',
  ],
  avaliador: [
    'can_apply_evaluations',
  ],
  auxiliar: [],
};

export const ALL_PERMISSIONS_METADATA: Array<{
  key: PermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: 'can_manage_collaborators',
    label: 'Gerenciar Colaboradores (can_manage_collaborators)',
    description: 'Cadastrar novos colaboradores, editar perfis, alterar status e atribuir checklists de treinamento.',
  },
  {
    key: 'can_manage_checklists',
    label: 'Gerenciar Checklists e Critérios (can_manage_checklists)',
    description: 'Criar e editar modelos de checklists, vincular exercícios e ponderar critérios de avaliação.',
  },
  {
    key: 'can_manage_exercises',
    label: 'Gerenciar Exercícios e Roteiros (can_manage_exercises)',
    description: 'Criar cenários de simulação com cliente, instruções para atores e realizar upload de guias.',
  },
  {
    key: 'can_apply_evaluations',
    label: 'Conduzir e Avaliar Simulações (can_apply_evaluations)',
    description: 'Iniciar treinamentos em tempo real, dar checks nos critérios e registrar a nota final.',
  },
  {
    key: 'users:manage',
    label: 'Administrar Usuários e Permissões (users:manage)',
    description: 'Ativar/desativar contas, alterar papéis e conceder permissões granulares.',
  },
  {
    key: 'cells:manage',
    label: 'Gerenciar Células e Padrões (cells:manage)',
    description: 'Cadastrar células de atendimento e homologar padrões de serviço.',
  },
];

export function checkUserPermission(
  user: UserProfile | null | undefined,
  requiredPermission: PermissionKey
): boolean {
  if (!user || !user.isActive) {
    return false;
  }

  // Admin possui controle total por padrão
  if (user.role === 'admin') {
    return true;
  }

  // Permissão individual explicitamente atribuída
  if (user.individualPermissions && user.individualPermissions.includes(requiredPermission)) {
    return true;
  }

  // Permissões padrão da role
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  return roleDefaults.includes(requiredPermission);
}

export function getEffectivePermissions(user: UserProfile | null | undefined): PermissionKey[] {
  if (!user || !user.isActive) return [];
  if (user.role === 'admin') {
    return ALL_PERMISSIONS_METADATA.map((p) => p.key);
  }
  const base = new Set<PermissionKey>(ROLE_DEFAULT_PERMISSIONS[user.role] || []);
  if (user.individualPermissions) {
    user.individualPermissions.forEach((p) => base.add(p));
  }
  return Array.from(base);
}
