import {
  AuditLogEntry,
  Category,
  Cell,
  Character,
  Checklist,
  Collaborator,
  CollaboratorChecklist,
  Criterion,
  Exercise,
  UserProfile,
} from '../types/portal';

// Estado inicial 100% limpo — sem dados falsos ou fictícios
export const INITIAL_CATEGORIES: Category[] = [];
export const INITIAL_CHARACTERS: Character[] = [];
export const INITIAL_CELLS: Cell[] = [];
export const INITIAL_CRITERIA: Criterion[] = [];
export const INITIAL_EXERCISES: Exercise[] = [];
export const INITIAL_CHECKLISTS: Checklist[] = [];
export const INITIAL_COLLABORATORS: Collaborator[] = [];
export const INITIAL_COLLABORATOR_CHECKLISTS: CollaboratorChecklist[] = [];
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

// Acesso Mestre Inicial do Administrador Corporativo
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-admin-master',
    username: 'david.furtado',
    fullName: 'David Furtado',
    email: 'david.furtado@portaldesempenho.corp',
    role: 'admin',
    status: 'aprovado_sem_senha',
    canChangePassword: true,
    isActive: true,
    password: '',
    department: 'Diretoria de Treinamento e Operações',
    individualPermissions: [
      'can_manage_collaborators',
      'can_manage_checklists',
      'can_manage_exercises',
      'can_apply_evaluations',
      'users:manage',
      'cells:manage',
    ],
    createdAt: '2026-10-13T08:00:00Z',
    lastLoginAt: '2026-10-13T08:00:00Z',
  },
];
