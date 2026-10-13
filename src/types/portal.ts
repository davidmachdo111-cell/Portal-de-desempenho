export type UserRole = 'admin' | 'avaliador' | 'auxiliar';

// Permissões Granulares
export type PermissionKey =
  | 'can_manage_collaborators' // pode criar e editar colaboradores
  | 'can_manage_checklists'    // pode criar e editar checklists e critérios
  | 'can_manage_exercises'     // pode criar exercícios, personagens e guias
  | 'can_apply_evaluations'    // pode conduzir e dar check em avaliações
  | 'users:manage'             // administração de contas de usuário
  | 'cells:manage';            // gestão de células e equipes

export type UserStatus =
  | 'pendente_aprovacao'
  | 'aprovado_sem_senha'
  | 'ativo'
  | 'bloqueado';

export interface UserProfile {
  id: string;
  username: string; // sempre em minúsculas, ex: 'david.furtado'
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  canChangePassword: boolean;
  password?: string;
  isActive: boolean;
  department: string;
  individualPermissions: PermissionKey[];
  createdAt: string;
  lastLoginAt: string;
}

export interface Cell {
  id: string;
  code: string;
  name: string;
  coordinatorName: string;
  hasServiceStandard: boolean;
  standardDocumentTitle: string;
  standardUpdatedAt: string;
}

export interface Criterion {
  id: string;
  code: string;
  sectionName: string;
  name: string;
  description: string;
  weight: number;
  isActive: boolean;
}

// 1. Categorias Padronizadas
export type CategoryType = 'checklist' | 'exercise' | 'geral';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
}

export type Gender = 'Masculino' | 'Feminino' | 'Outro';
export type CustomerTier = 'Iniciante' | 'Mediano' | 'Intermediário';
export type ExerciseDifficulty = 'Iniciante' | 'Mediano' | 'Intermediário';

// 2. characters: Banco de Clientes / Personagens Independentes
export interface Character {
  id: string;
  name: string;
  age: string; // ex: '45 anos'
  gender: Gender; // Sexo
  city: string; // ex: 'São Paulo - SP'
  cardNumber: string; // Número da Carteirinha
  customerTier: CustomerTier; // Classificação: Iniciante, Mediano, Intermediário
  serviceContext: string; // Contexto do Atendimento (substitui histórico antigo)
  temperament: string; // humor/comportamento
  objectives: string; // o que quer no atendimento
  typicalPhrases: string; // frases e objeções que deve falar
  guideAttachmentUrl?: string | null; // Guia de Atendimento do Cliente (PDF/imagem)
  guideAttachmentName?: string | null;
  createdAt: string;
  // Compatibilidade legada opcional
  history?: string;
}

// 3. exercises: Cenários de treinamento vinculando até 4 clientes
export interface Exercise {
  id: string;
  title: string;
  difficulty: ExerciseDifficulty; // Classificação de Dificuldade (Iniciante, Mediano, Intermediário)
  categoryId?: string; // FK categories (opcional/legado)
  categoryName?: string; // Denormalizado para exibição
  scenarioInstructions: string; // orientações do caso
  characterIds: string[]; // Vínculo N:M - até 4 clientes por exercício
  createdAt: string;
  updatedAt?: string;
  // Compatibilidade transitória
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

// 4. checklists: Modelos flexíveis (com ou sem exercícios simulados)
export interface ChecklistCriterion {
  id: string;
  name: string; // título do critério
  weight: number; // peso/pontuação (default 1)
}

export interface Checklist {
  id: string;
  title: string;
  description: string;
  categoryId?: string;
  categoryName?: string;
  hasExercises: boolean; // default false
  exerciseIds: string[]; // Vínculo N:M opcional
  criteria: ChecklistCriterion[]; // Critérios diretos do checklist
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 5. collaborators: Colaboradores em Treinamento
export type CollaboratorStatus = 'novo' | 'em_treinamento' | 'aprovado' | 'necessita_reforco';

export interface Collaborator {
  id: string;
  fullName: string;
  roleTitle: string;
  cellTeam: string; // nome ou código da célula
  registrationCode?: string;
  status: CollaboratorStatus;
  createdAt: string;
  updatedAt: string;
}

// 6. collaborator_checklists: Atribuição e Resultados das Avaliações
export type CollaboratorChecklistStatus = 'pendente' | 'em_andamento' | 'concluido';

export interface CriteriaAnswerSnapshot {
  criterionId: string;
  name: string;
  weight: number;
  checked: boolean;
  notes?: string;
}

export interface EvaluationSnapshotItem {
  criterionId: string;
  criterionCode?: string;
  criterionName: string;
  sectionName?: string;
  weight: number;
  score: number;
  isApplicable: boolean;
  notes?: string;
}

export interface CollaboratorChecklist {
  id: string;
  collaboratorId: string;
  checklistId: string;
  status: CollaboratorChecklistStatus;
  finalScore?: number | null;
  criteriaAnswers: CriteriaAnswerSnapshot[];
  generalObservations?: string | null;
  instructorAuxiliarId?: string | null;
  actorAuxiliarId?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  module: 'Autenticação' | 'Colaboradores' | 'Checklists' | 'Exercícios' | 'Personagens' | 'Avaliações' | 'Administração' | 'Categorias';
  targetDescription: string;
  status: 'Sucesso' | 'Bloqueado' | 'Erro';
}
