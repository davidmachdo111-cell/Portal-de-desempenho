export type UserRole = 'admin' | 'avaliador' | 'auxiliar';

export type PermissionKey =
  | 'users:manage'
  | 'cells:manage'
  | 'master_checklist:manage'
  | 'exercises:manage'
  | 'characters:manage'
  | 'evaluations:create'
  | 'evaluations:view'
  | 'materials:view'
  | 'materials:download'
  | 'audit:view';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
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

export interface Collaborator {
  id: string;
  registrationCode: string;
  fullName: string;
  email: string;
  cellId: string;
  roleTitle: string;
  isActive: boolean;
  admittedAt: string;
}

export interface ChecklistSection {
  id: string;
  code: string;
  name: string;
  orderIndex: number;
}

export interface Criterion {
  id: string;
  code: string;
  sectionId: string;
  sectionName: string;
  name: string;
  description: string;
  weight: number;
  isActive: boolean;
}

export interface Character {
  id: string;
  code: string;
  name: string;
  archetype: string;
  profileSummary: string;
  difficultyLevel: 'Básico' | 'Intermediário' | 'Avançado';
  customerMood: string;
  keyObjections: string[];
}

export interface ExerciseAttachment {
  id: string;
  title: string;
  fileName: string;
  fileSizeKb: number;
  storagePath: string;
  documentType: 'Guia do Avaliador' | 'Roteiro do Personagem' | 'Padrão de Atendimento' | 'Anexo Técnico';
  contentSummary: string[];
}

export interface Exercise {
  id: string;
  code: string;
  orderIndex: number; // 1 a 10 para o Checklist Mestre
  title: string;
  objective: string;
  scenarioDescription: string;
  estimatedMinutes: number;
  isActive: boolean;
  characterIds: string[]; // Relação N:M real
  attachments: ExerciseAttachment[];
}

export interface ExerciseCriterionLink {
  id: string;
  exerciseId: string;
  criterionId: string;
  createdAt: string;
}

export interface EvaluationSnapshotItem {
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  sectionName: string;
  weight: number;
  score: number; // 0 a 10
  isApplicable: boolean;
  notes: string;
}

export interface Evaluation {
  id: string;
  code: string;
  collaboratorId: string;
  cellId: string;
  evaluatorId: string;
  exerciseId: string;
  status: 'in_progress' | 'completed';
  finalScore: number | null;
  criteriaSnapshot: EvaluationSnapshotItem[];
  generalFeedback: string;
  startedAt: string;
  completedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  module: 'Autenticação' | 'Checklist Mestre' | 'Avaliações' | 'Exercícios & Personagens' | 'Administração';
  targetDescription: string;
  status: 'Sucesso' | 'Bloqueado' | 'Erro';
}
