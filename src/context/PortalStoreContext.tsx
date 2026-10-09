import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CELLS,
  INITIAL_CHARACTERS,
  INITIAL_COLLABORATORS,
  INITIAL_CRITERIA,
  INITIAL_EVALUATIONS,
  INITIAL_EXERCISE_CRITERIA_LINKS,
  INITIAL_EXERCISES,
  INITIAL_SECTIONS,
  INITIAL_USERS,
} from '../data/initialPortalData';
import { checkUserPermission } from '../lib/permissions';
import {
  AuditLogEntry,
  Cell,
  Character,
  ChecklistSection,
  Collaborator,
  Criterion,
  Evaluation,
  EvaluationSnapshotItem,
  Exercise,
  ExerciseCriterionLink,
  PermissionKey,
  UserProfile,
  UserRole,
} from '../types/portal';

interface MutationResult {
  success: boolean;
  message: string;
}

interface PortalStoreContextValue {
  // Autenticação & Sessão
  currentUser: UserProfile | null;
  users: UserProfile[];
  loginWithEmail: (email: string, password?: string) => MutationResult;
  switchDemoUser: (userId: string) => MutationResult;
  logout: () => void;
  hasPermission: (perm: PermissionKey) => boolean;

  // Dados institucionais
  cells: Cell[];
  collaborators: Collaborator[];
  sections: ChecklistSection[];
  criteria: Criterion[];
  characters: Character[];
  exercises: Exercise[];
  exerciseCriteriaLinks: ExerciseCriterionLink[];
  evaluations: Evaluation[];
  auditLogs: AuditLogEntry[];

  // Operações da Matriz do Checklist Mestre (Fonte única de verdade)
  getCriteriaIdsForExercise: (exerciseId: string) => string[];
  saveExerciseCriteriaLinks: (
    exerciseId: string,
    nextCriteriaIds: string[]
  ) => Promise<MutationResult>;
  toggleSingleMatrixLink: (
    exerciseId: string,
    criterionId: string
  ) => Promise<MutationResult>;
  setSectionCriteriaForExercise: (
    exerciseId: string,
    sectionId: string,
    selectAll: boolean
  ) => Promise<MutationResult>;

  // Operações de Exercícios e Personagens (N:M)
  saveExercise: (
    payload: Omit<Exercise, 'id' | 'attachments'> & {
      id?: string;
      attachments?: Exercise['attachments'];
    }
  ) => Promise<MutationResult>;
  generateSignedPdfDownload: (
    exerciseId: string,
    attachmentId: string
  ) => Promise<{ success: boolean; message: string; fileName?: string; blobUrl?: string }>;

  // Operações de Avaliações e Checklists
  validateCellEligibility: (cellId: string) => { eligible: boolean; reason?: string };
  createEvaluationDraft: (payload: {
    collaboratorId: string;
    exerciseId: string;
  }) => Promise<{ success: boolean; message: string; evaluationId?: string }>;
  saveEvaluationProgress: (
    evaluationId: string,
    items: EvaluationSnapshotItem[],
    generalFeedback: string,
    finalize: boolean
  ) => Promise<{ success: boolean; message: string; finalScore?: number | null }>;

  // Operações Administrativas
  updateUserStatusAndPermissions: (payload: {
    targetUserId: string;
    role: UserRole;
    isActive: boolean;
    individualPermissions: PermissionKey[];
  }) => Promise<MutationResult>;
  createNewUser: (payload: {
    fullName: string;
    email: string;
    role: UserRole;
    department: string;
    individualPermissions: PermissionKey[];
  }) => Promise<MutationResult>;
  toggleCellServiceStandard: (
    cellId: string,
    hasStandard: boolean,
    documentTitle?: string
  ) => Promise<MutationResult>;
  createNewCriterion: (payload: {
    sectionId: string;
    code: string;
    name: string;
    description: string;
    weight: number;
  }) => Promise<MutationResult>;
}

const PortalStoreContext = createContext<PortalStoreContextValue | null>(null);

export function calculateWeightedScore(items: EvaluationSnapshotItem[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const item of items) {
    if (item.isApplicable && item.weight > 0) {
      const clampedScore = Math.max(0, Math.min(10, Number(item.score) || 0));
      weightedSum += clampedScore * item.weight;
      totalWeight += item.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Number((weightedSum / totalWeight).toFixed(2));
}

export const PortalStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(INITIAL_USERS[0].id);

  const [cells, setCells] = useState<Cell[]>(INITIAL_CELLS);
  const [collaborators] = useState<Collaborator[]>(INITIAL_COLLABORATORS);
  const [sections] = useState<ChecklistSection[]>(INITIAL_SECTIONS);
  const [criteria, setCriteria] = useState<Criterion[]>(INITIAL_CRITERIA);
  const [characters] = useState<Character[]>(INITIAL_CHARACTERS);
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [exerciseCriteriaLinks, setExerciseCriteriaLinks] = useState<ExerciseCriterionLink[]>(
    INITIAL_EXERCISE_CRITERIA_LINKS
  );
  const [evaluations, setEvaluations] = useState<Evaluation[]>(INITIAL_EVALUATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  const appendAudit = useCallback(
    (
      action: string,
      module: AuditLogEntry['module'],
      targetDescription: string,
      status: AuditLogEntry['status'] = 'Sucesso',
      overrideActor?: UserProfile
    ) => {
      const actor = overrideActor || currentUser;
      const newEntry: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        actorId: actor?.id || 'anon',
        actorName: actor?.fullName || 'Usuário Não Autenticado',
        actorRole: actor?.role || 'auxiliar',
        action,
        module,
        targetDescription,
        status,
      };
      setAuditLogs((prev) => [newEntry, ...prev]);
    },
    [currentUser]
  );

  const hasPermission = useCallback(
    (perm: PermissionKey) => checkUserPermission(currentUser, perm),
    [currentUser]
  );

  const loginWithEmail = useCallback(
    (email: string): MutationResult => {
      const normalized = email.trim().toLowerCase();
      const target = users.find((u) => u.email.toLowerCase() === normalized);

      if (!target) {
        appendAudit(
          'Falha de login: credencial não localizada',
          'Autenticação',
          `Tentativa para o e-mail ${normalized}`,
          'Erro'
        );
        return {
          success: false,
          message: 'Credenciais inválidas ou usuário não cadastrado no diretório.',
        };
      }

      if (!target.isActive) {
        appendAudit(
          'Tentativa de acesso por conta inativa',
          'Autenticação',
          `Acesso bloqueado para ${target.fullName} (${target.email})`,
          'Bloqueado',
          target
        );
        return {
          success: false,
          message:
            'Acesso bloqueado: Seu perfil encontra-se inativo. Contate o Administrador do Portal.',
        };
      }

      setCurrentUserId(target.id);
      appendAudit(
        'Sessão iniciada via Supabase Auth',
        'Autenticação',
        `Login autenticado para ${target.fullName} [${target.role.toUpperCase()}]`,
        'Sucesso',
        target
      );
      return {
        success: true,
        message: `Bem-vindo(a), ${target.fullName}.`,
      };
    },
    [users, appendAudit]
  );

  const switchDemoUser = useCallback(
    (userId: string): MutationResult => {
      const target = users.find((u) => u.id === userId);
      if (!target) {
        return { success: false, message: 'Usuário não encontrado.' };
      }
      if (!target.isActive) {
        appendAudit(
          'Bloqueio de troca de sessão para usuário inativo',
          'Autenticação',
          `Conta ${target.fullName} está desativada`,
          'Bloqueado',
          target
        );
        return {
          success: false,
          message: `A conta de ${target.fullName} está inativa e não pode acessar módulos protegidos.`,
        };
      }
      setCurrentUserId(target.id);
      return {
        success: true,
        message: `Sessão alternada para ${target.fullName} (${target.role}).`,
      };
    },
    [users, appendAudit]
  );

  const logout = useCallback(() => {
    if (currentUser) {
      appendAudit(
        'Encerramento de sessão',
        'Autenticação',
        `Logout realizado por ${currentUser.fullName}`,
        'Sucesso'
      );
    }
    setCurrentUserId(null);
  }, [currentUser, appendAudit]);

  const getCriteriaIdsForExercise = useCallback(
    (exerciseId: string): string[] => {
      const set = new Set<string>();
      for (const link of exerciseCriteriaLinks) {
        if (link.exerciseId === exerciseId) {
          set.add(link.criterionId);
        }
      }
      return Array.from(set);
    },
    [exerciseCriteriaLinks]
  );

  // Salva vínculos de um exercício específico de forma atômica, sem tocar nos outros exercícios
  const saveExerciseCriteriaLinks = useCallback(
    async (exerciseId: string, nextCriteriaIds: string[]): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'master_checklist:manage')) {
        appendAudit(
          'Tentativa não autorizada de alterar Matriz do Checklist Mestre',
          'Checklist Mestre',
          `Usuário ${currentUser?.fullName || 'Anônimo'} sem permissão master_checklist:manage`,
          'Bloqueado'
        );
        return {
          success: false,
          message: 'Acesso negado: Você não possui permissão para editar vínculos da matriz.',
        };
      }

      const targetExercise = exercises.find((e) => e.id === exerciseId);
      if (!targetExercise) {
        return {
          success: false,
          message: 'Exercício de destino não encontrado.',
        };
      }

      // Deduplicação estrita para impedir vínculos duplicados
      const deduplicatedIds = Array.from(new Set(nextCriteriaIds));

      setExerciseCriteriaLinks((prevLinks) => {
        // Preserva intactos todos os vínculos de outros exercícios
        const otherExercisesLinks = prevLinks.filter(
          (lnk) => lnk.exerciseId !== exerciseId
        );

        const nowIso = new Date().toISOString();
        const updatedForTarget: ExerciseCriterionLink[] = deduplicatedIds.map(
          (critId) => {
            const existing = prevLinks.find(
              (l) => l.exerciseId === exerciseId && l.criterionId === critId
            );
            return (
              existing || {
                id: `lnk-${exerciseId}-${critId}`,
                exerciseId,
                criterionId: critId,
                createdAt: nowIso,
              }
            );
          }
        );

        return [...otherExercisesLinks, ...updatedForTarget];
      });

      appendAudit(
        'Atualização atômica de vínculos de critérios',
        'Checklist Mestre',
        `${targetExercise.code}: ${deduplicatedIds.length} critério(s) vinculado(s) sem afetar demais exercícios`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Vínculos do ${targetExercise.code} salvos com sucesso (${deduplicatedIds.length} critérios ativos).`,
      };
    },
    [currentUser, exercises, appendAudit]
  );

  const toggleSingleMatrixLink = useCallback(
    async (exerciseId: string, criterionId: string): Promise<MutationResult> => {
      const currentIds = getCriteriaIdsForExercise(exerciseId);
      const exists = currentIds.includes(criterionId);
      const nextIds = exists
        ? currentIds.filter((id) => id !== criterionId)
        : [...currentIds, criterionId];

      return saveExerciseCriteriaLinks(exerciseId, nextIds);
    },
    [getCriteriaIdsForExercise, saveExerciseCriteriaLinks]
  );

  const setSectionCriteriaForExercise = useCallback(
    async (
      exerciseId: string,
      sectionId: string,
      selectAll: boolean
    ): Promise<MutationResult> => {
      const sectionCriterionIds = criteria
        .filter((c) => c.sectionId === sectionId && c.isActive)
        .map((c) => c.id);

      const currentIds = new Set(getCriteriaIdsForExercise(exerciseId));
      if (selectAll) {
        sectionCriterionIds.forEach((id) => currentIds.add(id));
      } else {
        sectionCriterionIds.forEach((id) => currentIds.delete(id));
      }

      return saveExerciseCriteriaLinks(exerciseId, Array.from(currentIds));
    },
    [criteria, getCriteriaIdsForExercise, saveExerciseCriteriaLinks]
  );

  const saveExercise = useCallback(
    async (
      payload: Omit<Exercise, 'id' | 'attachments'> & {
        id?: string;
        attachments?: Exercise['attachments'];
      }
    ): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'exercises:manage')) {
        appendAudit(
          'Bloqueio de edição de exercício',
          'Exercícios & Personagens',
          'Tentativa sem permissão exercises:manage',
          'Bloqueado'
        );
        return {
          success: false,
          message: 'Acesso negado: Permissão insuficiente para criar ou editar exercícios.',
        };
      }

      if (!payload.title.trim() || !payload.code.trim() || !payload.objective.trim()) {
        return {
          success: false,
          message: 'Preencha todos os campos obrigatórios (Código, Título e Objetivo).',
        };
      }

      const uniqueCharIds = Array.from(new Set(payload.characterIds));

      if (payload.id) {
        // Operação de Edição isolada pelo ID
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === payload.id
              ? {
                  ...ex,
                  code: payload.code.trim(),
                  title: payload.title.trim(),
                  objective: payload.objective.trim(),
                  scenarioDescription: payload.scenarioDescription.trim(),
                  estimatedMinutes: payload.estimatedMinutes,
                  orderIndex: payload.orderIndex,
                  isActive: payload.isActive,
                  characterIds: uniqueCharIds,
                  attachments: payload.attachments ?? ex.attachments,
                }
              : ex
          )
        );
        appendAudit(
          'Edição de Exercício e Vínculos de Personagens',
          'Exercícios & Personagens',
          `Exercício ${payload.code} atualizado com ${uniqueCharIds.length} personagem(ns)`,
          'Sucesso'
        );
        return {
          success: true,
          message: `Exercício ${payload.code} atualizado com sucesso.`,
        };
      } else {
        // Operação de Criação distinta da edição
        const newId = `ex-${Date.now()}`;
        const newExercise: Exercise = {
          id: newId,
          code: payload.code.trim().toUpperCase(),
          orderIndex: payload.orderIndex,
          title: payload.title.trim(),
          objective: payload.objective.trim(),
          scenarioDescription: payload.scenarioDescription.trim(),
          estimatedMinutes: payload.estimatedMinutes,
          isActive: payload.isActive,
          characterIds: uniqueCharIds,
          attachments: payload.attachments || [
            {
              id: `att-${Date.now()}`,
              title: `Guia Oficial — ${payload.code.trim().toUpperCase()}`,
              fileName: `guia_${payload.code.trim().toLowerCase()}.pdf`,
              fileSizeKb: 450,
              storagePath: `portal-materials/exercicios/${newId}/guia.pdf`,
              documentType: 'Guia do Avaliador',
              contentSummary: [payload.objective.trim(), payload.scenarioDescription.trim()],
            },
          ],
        };
        setExercises((prev) => [...prev, newExercise]);
        appendAudit(
          'Criação de Novo Exercício',
          'Exercícios & Personagens',
          `Novo exercício ${newExercise.code} registrado com ${uniqueCharIds.length} personagem(ns)`,
          'Sucesso'
        );
        return {
          success: true,
          message: `Novo exercício ${newExercise.code} criado com sucesso.`,
        };
      }
    },
    [currentUser, appendAudit]
  );

  const generateSignedPdfDownload = useCallback(
    async (
      exerciseId: string,
      attachmentId: string
    ): Promise<{ success: boolean; message: string; fileName?: string; blobUrl?: string }> => {
      if (!checkUserPermission(currentUser, 'materials:download')) {
        appendAudit(
          'Tentativa bloqueada de download de PDF',
          'Exercícios & Personagens',
          `Usuário sem permissão materials:download tentou baixar anexo ${attachmentId}`,
          'Bloqueado'
        );
        return {
          success: false,
          message: 'Acesso negado: Seu perfil não possui autorização para download de anexos.',
        };
      }

      const ex = exercises.find((e) => e.id === exerciseId);
      const att = ex?.attachments.find((a) => a.id === attachmentId);
      if (!ex || !att) {
        return { success: false, message: 'Arquivo não localizado no repositório.' };
      }

      const linkedCharacters = characters.filter((c) => ex.characterIds.includes(c.id));
      const linkedCriteriaIds = getCriteriaIdsForExercise(ex.id);
      const linkedCriteria = criteria.filter((c) => linkedCriteriaIds.includes(c.id));

      const documentContent = [
        '====================================================================',
        'PORTAL DE DESEMPENHO — DOCUMENTO OFICIAL CONTROLADO (SIGNED URL)',
        '====================================================================',
        `Documento: ${att.title}`,
        `Arquivo: ${att.fileName} (${att.fileSizeKb} KB)`,
        `Classificação: ${att.documentType}`,
        `Storage Path: ${att.storagePath}`,
        `Emitido para: ${currentUser?.fullName} (${currentUser?.email})`,
        `Data/Hora de Emissão: ${new Date().toLocaleString('pt-BR')}`,
        '--------------------------------------------------------------------',
        `EXERCÍCIO: ${ex.code} — ${ex.title}`,
        `Tempo Estimado: ${ex.estimatedMinutes} minutos`,
        `Objetivo: ${ex.objective}`,
        `Cenário: ${ex.scenarioDescription}`,
        '--------------------------------------------------------------------',
        `PERSONAGENS VINCULADOS (${linkedCharacters.length}):`,
        ...linkedCharacters.map(
          (ch) => `  • [${ch.code}] ${ch.name} (${ch.difficultyLevel}) — ${ch.archetype}`
        ),
        '--------------------------------------------------------------------',
        `CRITÉRIOS DO CHECKLIST MESTRE VINCULADOS (${linkedCriteria.length}):`,
        ...linkedCriteria.map(
          (cr) => `  • [${cr.code}] (Peso ${cr.weight}) ${cr.name}`
        ),
        '--------------------------------------------------------------------',
        'DIRETRIZES OPERACIONAIS DO ANEXO:',
        ...att.contentSummary.map((line) => `  * ${line}`),
        '====================================================================',
      ].join('\n');

      const blob = new Blob([documentContent], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      appendAudit(
        'Download autorizado de anexo (Signed URL)',
        'Exercícios & Personagens',
        `Arquivo ${att.fileName} baixado por ${currentUser?.fullName}`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Download de "${att.fileName}" autorizado via URL assinada.`,
        fileName: att.fileName.replace(/\.pdf$/i, '_oficial.txt'),
        blobUrl,
      };
    },
    [currentUser, exercises, characters, criteria, getCriteriaIdsForExercise, appendAudit]
  );

  const validateCellEligibility = useCallback(
    (cellId: string): { eligible: boolean; reason?: string } => {
      const cell = cells.find((c) => c.id === cellId);
      if (!cell) {
        return { eligible: false, reason: 'Célula operacional não encontrada.' };
      }
      if (!cell.hasServiceStandard) {
        return {
          eligible: false,
          reason: `Bloqueio Institucional: A célula "${cell.name}" (${cell.code}) não possui Padrão de Atendimento homologado. Não é permitido preparar ou aplicar checklists até a regularização.`,
        };
      }
      return { eligible: true };
    },
    [cells]
  );

  const createEvaluationDraft = useCallback(
    async ({
      collaboratorId,
      exerciseId,
    }: {
      collaboratorId: string;
      exerciseId: string;
    }): Promise<{ success: boolean; message: string; evaluationId?: string }> => {
      if (!checkUserPermission(currentUser, 'evaluations:create')) {
        appendAudit(
          'Bloqueio de criação de avaliação',
          'Avaliações',
          `Usuário ${currentUser?.fullName} não possui permissão evaluations:create`,
          'Bloqueado'
        );
        return {
          success: false,
          message: 'Acesso negado: Apenas Avaliadores autorizados ou Administradores podem iniciar avaliações.',
        };
      }

      const collaborator = collaborators.find((c) => c.id === collaboratorId);
      if (!collaborator) {
        return { success: false, message: 'Colaborador selecionado não encontrado.' };
      }

      // Regra de negócio obrigatória: verificar Padrão de Atendimento da célula
      const eligibility = validateCellEligibility(collaborator.cellId);
      if (!eligibility.eligible) {
        appendAudit(
          'Bloqueio de Checklist por ausência de Padrão de Atendimento da Célula',
          'Avaliações',
          eligibility.reason || 'Célula sem padrão homologado',
          'Bloqueado'
        );
        return {
          success: false,
          message: eligibility.reason || 'Célula sem Padrão de Atendimento.',
        };
      }

      const linkedCriterionIds = getCriteriaIdsForExercise(exerciseId);
      const linkedCriteria = criteria.filter(
        (c) => linkedCriterionIds.includes(c.id) && c.isActive
      );

      if (linkedCriteria.length === 0) {
        return {
          success: false,
          message:
            'Este exercício não possui critérios vinculados no Checklist Mestre. Vincule critérios antes de iniciar a avaliação.',
        };
      }

      const snapshotItems: EvaluationSnapshotItem[] = linkedCriteria.map((c) => ({
        criterionId: c.id,
        criterionCode: c.code,
        criterionName: c.name,
        sectionName: c.sectionName,
        weight: c.weight,
        score: 8.5,
        isApplicable: true,
        notes: '',
      }));

      const newEval: Evaluation = {
        id: `eval-${Date.now()}`,
        code: `AV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        collaboratorId: collaborator.id,
        cellId: collaborator.cellId,
        evaluatorId: currentUser!.id,
        exerciseId,
        status: 'in_progress',
        finalScore: null,
        criteriaSnapshot: snapshotItems,
        generalFeedback: '',
        startedAt: new Date().toISOString(),
        completedAt: null,
      };

      setEvaluations((prev) => [newEval, ...prev]);
      appendAudit(
        'Abertura de Checklist de Avaliação',
        'Avaliações',
        `Avaliação ${newEval.code} iniciada para ${collaborator.fullName}`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Checklist ${newEval.code} preparado com ${snapshotItems.length} critérios vinculados.`,
        evaluationId: newEval.id,
      };
    },
    [
      currentUser,
      collaborators,
      validateCellEligibility,
      getCriteriaIdsForExercise,
      criteria,
      appendAudit,
    ]
  );

  const saveEvaluationProgress = useCallback(
    async (
      evaluationId: string,
      items: EvaluationSnapshotItem[],
      generalFeedback: string,
      finalize: boolean
    ): Promise<{ success: boolean; message: string; finalScore?: number | null }> => {
      if (!checkUserPermission(currentUser, 'evaluations:create')) {
        return {
          success: false,
          message: 'Acesso negado: Você não possui permissão para salvar ou concluir avaliações.',
        };
      }

      const existing = evaluations.find((e) => e.id === evaluationId);
      if (!existing) {
        return { success: false, message: 'Avaliação não encontrada.' };
      }

      if (existing.status === 'completed') {
        return {
          success: false,
          message:
            'Imutabilidade Histórica: Esta avaliação já foi concluída e seu snapshot não pode ser sobrescrito.',
        };
      }

      const eligibility = validateCellEligibility(existing.cellId);
      if (!eligibility.eligible) {
        return {
          success: false,
          message: eligibility.reason || 'Célula sem Padrão de Atendimento ativo.',
        };
      }

      const calculatedScore = calculateWeightedScore(items);

      setEvaluations((prev) =>
        prev.map((ev) =>
          ev.id === evaluationId
            ? {
                ...ev,
                status: finalize ? 'completed' : 'in_progress',
                finalScore: finalize ? calculatedScore : null,
                criteriaSnapshot: items.map((item) => ({ ...item })), // Snapshot isolado
                generalFeedback: generalFeedback.trim(),
                completedAt: finalize ? new Date().toISOString() : null,
              }
            : ev
        )
      );

      appendAudit(
        finalize
          ? 'Conclusão de Avaliação com Snapshot Imutável'
          : 'Salvamento parcial de Avaliação em andamento',
        'Avaliações',
        `Avaliação ${existing.code} ${
          finalize ? `concluída com média ponderada ${calculatedScore.toFixed(2)}` : 'atualizada em rascunho'
        }`,
        'Sucesso'
      );

      return {
        success: true,
        message: finalize
          ? `Avaliação ${existing.code} concluída! Média final ponderada: ${calculatedScore.toFixed(2)}.`
          : `Rascunho da avaliação ${existing.code} salvo com sucesso.`,
        finalScore: finalize ? calculatedScore : null,
      };
    },
    [currentUser, evaluations, validateCellEligibility, appendAudit]
  );

  const updateUserStatusAndPermissions = useCallback(
    async ({
      targetUserId,
      role,
      isActive,
      individualPermissions,
    }: {
      targetUserId: string;
      role: UserRole;
      isActive: boolean;
      individualPermissions: PermissionKey[];
    }): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'users:manage')) {
        appendAudit(
          'Bloqueio de alteração de permissões de usuário',
          'Administração',
          `Usuário ${currentUser?.fullName} tentou editar perfil ${targetUserId}`,
          'Bloqueado'
        );
        return {
          success: false,
          message: 'Acesso negado: Permissão users:manage exigida.',
        };
      }

      const target = users.find((u) => u.id === targetUserId);
      if (!target) {
        return { success: false, message: 'Usuário alvo não localizado.' };
      }

      const deduplicatedPerms = Array.from(new Set(individualPermissions));

      // Atualização estritamente isolada por targetUserId (Cenário 5)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? {
                ...u,
                role,
                isActive,
                individualPermissions: deduplicatedPerms,
              }
            : u
        )
      );

      appendAudit(
        'Atualização de Perfil e Permissões Individuais',
        'Administração',
        `${target.fullName}: perfil=${role}, ativo=${isActive}, permissões extras=[${deduplicatedPerms.join(', ')}]`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Configurações de acesso de ${target.fullName} atualizadas com sucesso.`,
      };
    },
    [currentUser, users, appendAudit]
  );

  const createNewUser = useCallback(
    async ({
      fullName,
      email,
      role,
      department,
      individualPermissions,
    }: {
      fullName: string;
      email: string;
      role: UserRole;
      department: string;
      individualPermissions: PermissionKey[];
    }): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'users:manage')) {
        return {
          success: false,
          message: 'Acesso negado: Apenas administradores podem cadastrar usuários.',
        };
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!fullName.trim() || !cleanEmail.includes('@')) {
        return {
          success: false,
          message: 'Informe o nome completo e um e-mail corporativo válido.',
        };
      }

      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return {
          success: false,
          message: 'Já existe um usuário registrado com este endereço de e-mail.',
        };
      }

      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        fullName: fullName.trim(),
        role,
        isActive: true,
        department: department.trim() || 'Operações Corporativas',
        individualPermissions: Array.from(new Set(individualPermissions)),
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      setUsers((prev) => [...prev, newUser]);
      appendAudit(
        'Provisionamento Transacional de Usuário (Auth + Profile)',
        'Administração',
        `Criado usuário ${newUser.fullName} (${newUser.email}) com perfil ${newUser.role}`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Usuário ${newUser.fullName} provisionado com sucesso.`,
      };
    },
    [currentUser, users, appendAudit]
  );

  const toggleCellServiceStandard = useCallback(
    async (
      cellId: string,
      hasStandard: boolean,
      documentTitle?: string
    ): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'cells:manage')) {
        return {
          success: false,
          message: 'Acesso negado: Permissão cells:manage necessária.',
        };
      }

      const targetCell = cells.find((c) => c.id === cellId);
      if (!targetCell) {
        return { success: false, message: 'Célula não localizada.' };
      }

      const today = new Date().toISOString().slice(0, 10);

      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? {
                ...c,
                hasServiceStandard: hasStandard,
                standardDocumentTitle: hasStandard
                  ? documentTitle || `PAD-${c.code}-2026 — Padrão Homologado`
                  : 'Pendente de Homologação pela Qualidade',
                standardUpdatedAt: hasStandard ? today : '—',
              }
            : c
        )
      );

      appendAudit(
        hasStandard
          ? 'Homologação de Padrão de Atendimento de Célula'
          : 'Suspensão de Padrão de Atendimento de Célula',
        'Administração',
        `Célula ${targetCell.name} (${targetCell.code}) agora está com Padrão=${hasStandard ? 'ATIVO' : 'PENDENTE'}`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Padrão de Atendimento da célula "${targetCell.name}" atualizado para ${
          hasStandard ? 'Homologado' : 'Pendente'
        }.`,
      };
    },
    [currentUser, cells, appendAudit]
  );

  const createNewCriterion = useCallback(
    async ({
      sectionId,
      code,
      name,
      description,
      weight,
    }: {
      sectionId: string;
      code: string;
      name: string;
      description: string;
      weight: number;
    }): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'master_checklist:manage')) {
        return {
          success: false,
          message: 'Acesso negado para cadastrar novos critérios.',
        };
      }

      const section = sections.find((s) => s.id === sectionId);
      if (!section || !name.trim() || !code.trim()) {
        return {
          success: false,
          message: 'Informe seção, código e descrição completa do critério.',
        };
      }

      const newCrit: Criterion = {
        id: `crit-${Date.now()}`,
        code: code.trim().toUpperCase(),
        sectionId: section.id,
        sectionName: section.name,
        name: name.trim(),
        description: description.trim() || 'Critério institucional homologado.',
        weight: Math.max(1, Math.min(5, Number(weight) || 1)),
        isActive: true,
      };

      setCriteria((prev) => [...prev, newCrit]);
      appendAudit(
        'Inclusão de Novo Critério no Checklist Mestre',
        'Checklist Mestre',
        `Critério ${newCrit.code} adicionado na seção "${section.name}"`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Critério ${newCrit.code} adicionado ao catálogo do Checklist Mestre.`,
      };
    },
    [currentUser, sections, appendAudit]
  );

  const value = useMemo<PortalStoreContextValue>(
    () => ({
      currentUser,
      users,
      loginWithEmail,
      switchDemoUser,
      logout,
      hasPermission,
      cells,
      collaborators,
      sections,
      criteria,
      characters,
      exercises,
      exerciseCriteriaLinks,
      evaluations,
      auditLogs,
      getCriteriaIdsForExercise,
      saveExerciseCriteriaLinks,
      toggleSingleMatrixLink,
      setSectionCriteriaForExercise,
      saveExercise,
      generateSignedPdfDownload,
      validateCellEligibility,
      createEvaluationDraft,
      saveEvaluationProgress,
      updateUserStatusAndPermissions,
      createNewUser,
      toggleCellServiceStandard,
      createNewCriterion,
    }),
    [
      currentUser,
      users,
      loginWithEmail,
      switchDemoUser,
      logout,
      hasPermission,
      cells,
      collaborators,
      sections,
      criteria,
      characters,
      exercises,
      exerciseCriteriaLinks,
      evaluations,
      auditLogs,
      getCriteriaIdsForExercise,
      saveExerciseCriteriaLinks,
      toggleSingleMatrixLink,
      setSectionCriteriaForExercise,
      saveExercise,
      generateSignedPdfDownload,
      validateCellEligibility,
      createEvaluationDraft,
      saveEvaluationProgress,
      updateUserStatusAndPermissions,
      createNewUser,
      toggleCellServiceStandard,
      createNewCriterion,
    ]
  );

  return (
    <PortalStoreContext.Provider value={value}>
      {children}
    </PortalStoreContext.Provider>
  );
};

export function usePortalStore(): PortalStoreContextValue {
  const ctx = useContext(PortalStoreContext);
  if (!ctx) {
    throw new Error('usePortalStore deve ser utilizado dentro de PortalStoreProvider');
  }
  return ctx;
}
