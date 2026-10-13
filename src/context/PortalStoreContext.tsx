import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_CELLS,
  INITIAL_CHARACTERS,
  INITIAL_CHECKLISTS,
  INITIAL_COLLABORATOR_CHECKLISTS,
  INITIAL_COLLABORATORS,
  INITIAL_CRITERIA,
  INITIAL_EXERCISES,
  INITIAL_USERS,
} from '../data/initialPortalData';
import { checkUserPermission } from '../lib/permissions';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  AuditLogEntry,
  Category,
  CategoryType,
  Cell,
  Character,
  Checklist,
  ChecklistCriterion,
  Collaborator,
  CollaboratorChecklist,
  CollaboratorStatus,
  CriteriaAnswerSnapshot,
  Criterion,
  Exercise,
  PermissionKey,
  UserProfile,
  UserRole,
  UserStatus,
} from '../types/portal';

interface MutationResult {
  success: boolean;
  message: string;
}

export interface LoginResult {
  success: boolean;
  status?: UserStatus;
  user?: UserProfile;
  message: string;
}

interface PortalStoreContextValue {
  // Autenticação & Sessão Corporativa
  currentUser: UserProfile | null;
  users: UserProfile[];
  loginWithUsername: (username: string, password?: string) => LoginResult;
  loginWithEmail: (email: string, password?: string) => MutationResult;
  requestAccess: (fullName: string, requestedUsername: string) => Promise<MutationResult>;
  setPassword: (username: string, newPassword: string) => Promise<MutationResult>;
  approveUser: (userId: string, role: UserRole) => Promise<MutationResult>;
  rejectOrBlockUser: (userId: string) => Promise<MutationResult>;
  unblockUser: (userId: string) => Promise<MutationResult>;
  unlockPasswordChange: (userId: string) => Promise<MutationResult>;
  switchDemoUser: (userId: string) => MutationResult;
  logout: () => void;
  hasPermission: (perm: PermissionKey) => boolean;

  // Dados Centrais
  categories: Category[];
  cells: Cell[];
  criteria: Criterion[];
  characters: Character[];
  exercises: Exercise[];
  checklists: Checklist[];
  collaborators: Collaborator[];
  collaboratorChecklists: CollaboratorChecklist[];
  auditLogs: AuditLogEntry[];

  // 1. Categorias Padronizadas
  createCategory: (payload: {
    name: string;
    type?: CategoryType;
    description?: string;
  }) => Promise<MutationResult & { category?: Category }>;

  // 2. Banco de Clientes / Personagens Independentes (CRUD)
  saveCharacter: (payload: {
    id?: string;
    name: string;
    age: string;
    gender: 'Masculino' | 'Feminino' | 'Outro';
    city: string;
    cardNumber: string;
    customerTier: 'Iniciante' | 'Mediano' | 'Intermediário';
    serviceContext: string;
    temperament: string;
    objectives: string;
    typicalPhrases: string;
    guideAttachmentUrl?: string | null;
    guideAttachmentName?: string | null;
  }) => Promise<MutationResult & { characterId?: string }>;
  deleteCharacter: (characterId: string) => Promise<MutationResult>;
  uploadClientGuide: (
    file: File
  ) => Promise<{ success: boolean; message: string; url?: string; fileName?: string }>;

  // 3. Exercícios e Cenários (CRUD com até 4 Clientes)
  saveExercise: (payload: {
    id?: string;
    title: string;
    difficulty: 'Iniciante' | 'Mediano' | 'Intermediário';
    categoryId?: string;
    categoryName?: string;
    scenarioInstructions: string;
    characterIds: string[];
    attachmentUrl?: string | null;
    attachmentName?: string | null;
  }) => Promise<MutationResult & { exerciseId?: string }>;
  deleteExercise: (exerciseId: string) => Promise<MutationResult>;
  uploadExerciseGuide: (
    file: File
  ) => Promise<{ success: boolean; message: string; url?: string; fileName?: string }>;

  // 4. Checklists Flexíveis (com ou sem exercícios) (CRUD)
  saveChecklist: (payload: {
    id?: string;
    title: string;
    description: string;
    categoryId?: string;
    categoryName?: string;
    hasExercises: boolean;
    exerciseIds: string[];
    criteria: Array<{ id?: string; name: string; weight: number }>;
  }) => Promise<MutationResult & { checklistId?: string }>;
  deleteChecklist: (checklistId: string) => Promise<MutationResult>;

  // 5. Colaboradores & Vínculos (CRUD com Edição)
  createCollaborator: (payload: {
    fullName: string;
    roleTitle: string;
    cellTeam: string;
    registrationCode?: string;
    status: CollaboratorStatus;
    initialChecklistIds?: string[];
  }) => Promise<MutationResult & { collaboratorId?: string }>;
  updateCollaborator: (payload: {
    id: string;
    fullName: string;
    roleTitle: string;
    cellTeam: string;
    registrationCode?: string;
    status: CollaboratorStatus;
  }) => Promise<MutationResult>;
  deleteCollaborator: (collaboratorId: string) => Promise<MutationResult>;
  updateCollaboratorChecklistAssignments: (
    collaboratorId: string,
    checklistIds: string[]
  ) => Promise<MutationResult>;

  // 6. Condução e Execução de Avaliação
  completeEvaluation: (payload: {
    collaboratorChecklistId: string;
    instructorAuxiliarId?: string | null;
    actorAuxiliarId?: string | null;
    criteriaAnswers: CriteriaAnswerSnapshot[];
    finalScore: number;
    generalObservations?: string;
    updateCollaboratorStatus?: CollaboratorStatus;
  }) => Promise<MutationResult>;

  // 7. Governança e Usuários
  updateUserPermissions: (payload: {
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
}

const PortalStoreContext = createContext<PortalStoreContextValue | null>(null);

export function calculateWeightedScore(criteriaAnswers: CriteriaAnswerSnapshot[]): number {
  let totalScoreWeight = 0;
  let totalPossibleWeight = 0;

  for (const item of criteriaAnswers) {
    const weight = Number(item.weight) || 1;
    totalPossibleWeight += weight;
    if (item.checked) {
      totalScoreWeight += weight;
    }
  }

  if (totalPossibleWeight === 0) return 0;
  const scoreOnTen = (totalScoreWeight / totalPossibleWeight) * 10;
  return Number(scoreOnTen.toFixed(1));
}

export const PortalStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem('portal_users_store');
      if (stored) {
        const parsed: UserProfile[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Garante que o administrador mestre david.furtado sempre exista
          if (!parsed.some((u) => u.username === 'david.furtado')) {
            const master = INITIAL_USERS.find((u) => u.username === 'david.furtado');
            if (master) parsed.unshift(master);
          }
          return parsed;
        }
      }
    } catch {
      // fallback para dados iniciais
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('portal_current_user_id');
      if (saved !== null) {
        return saved === '' ? null : saved;
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS[0]?.id || null;
  });

  // Persistência automática
  React.useEffect(() => {
    try {
      localStorage.setItem('portal_users_store', JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  React.useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem('portal_current_user_id', currentUserId);
      } else {
        localStorage.removeItem('portal_current_user_id');
      }
    } catch {
      // ignore
    }
  }, [currentUserId]);

  // Limpeza preventiva de quaisquer resquícios de mocks legados no localStorage
  React.useEffect(() => {
    try {
      if (!localStorage.getItem('portal_clean_mocks_v5')) {
        localStorage.removeItem('portal_characters_store');
        localStorage.removeItem('portal_exercises_store');
        localStorage.removeItem('portal_checklists_store');
        localStorage.removeItem('portal_collaborators_store');
        localStorage.removeItem('portal_collaborator_checklists_store');
        localStorage.removeItem('portal_categories_store');
        localStorage.removeItem('portal_audit_logs_store');
        localStorage.setItem('portal_clean_mocks_v5', 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_categories_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  const [cells, setCells] = useState<Cell[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_cells_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  const [criteria, setCriteria] = useState<Criterion[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_criteria_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_characters_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  const [exercises, setExercises] = useState<Exercise[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_exercises_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  const [checklists, setChecklists] = useState<Checklist[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_checklists_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_collaborators_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  const [collaboratorChecklists, setCollaboratorChecklists] = useState<CollaboratorChecklist[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_collaborator_checklists_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      if (localStorage.getItem('portal_clean_mocks_v5')) {
        const s = localStorage.getItem('portal_audit_logs_store');
        if (s) return JSON.parse(s);
      }
    } catch {}
    return [];
  });

  // Persistência local contínua para prevenir perda ou retorno de dados excluídos
  React.useEffect(() => {
    try {
      localStorage.setItem('portal_characters_store', JSON.stringify(characters));
    } catch {}
  }, [characters]);

  React.useEffect(() => {
    try {
      localStorage.setItem('portal_exercises_store', JSON.stringify(exercises));
    } catch {}
  }, [exercises]);

  React.useEffect(() => {
    try {
      localStorage.setItem('portal_checklists_store', JSON.stringify(checklists));
    } catch {}
  }, [checklists]);

  React.useEffect(() => {
    try {
      localStorage.setItem('portal_collaborators_store', JSON.stringify(collaborators));
    } catch {}
  }, [collaborators]);

  React.useEffect(() => {
    try {
      localStorage.setItem('portal_collaborator_checklists_store', JSON.stringify(collaboratorChecklists));
    } catch {}
  }, [collaboratorChecklists]);

  React.useEffect(() => {
    try {
      localStorage.setItem('portal_categories_store', JSON.stringify(categories));
    } catch {}
  }, [categories]);

  React.useEffect(() => {
    try {
      localStorage.setItem('portal_audit_logs_store', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  // Sincronização real com banco de dados Supabase (sem fallback para mocks se tabela estiver vazia)
  const fetchAllFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      // 1. Clientes
      const { data: dbChars } = await supabase.from('characters').select('*').order('created_at', { ascending: false });
      if (dbChars) {
        setCharacters(
          dbChars.map((c: any) => ({
            id: c.id,
            name: c.name || '',
            age: c.age || '',
            gender: c.gender || 'Outro',
            city: c.city || '',
            cardNumber: c.card_number || '',
            customerTier: c.customer_tier || 'Mediano',
            serviceContext: c.service_context || c.history || '',
            temperament: c.temperament || '',
            objectives: c.objectives || '',
            typicalPhrases: c.typical_phrases || '',
            guideAttachmentUrl: c.guide_attachment_url || null,
            guideAttachmentName: c.guide_attachment_name || null,
            createdAt: c.created_at || new Date().toISOString(),
          }))
        );
      }

      // 2. Exercícios
      const { data: dbExercises } = await supabase
        .from('exercises')
        .select('*, exercise_characters(character_id, order_index)')
        .order('created_at', { ascending: false });
      if (dbExercises) {
        setExercises(
          dbExercises.map((e: any) => ({
            id: e.id,
            title: e.title || '',
            difficulty: e.difficulty || 'Mediano',
            categoryId: e.category_id || undefined,
            categoryName: e.category_name || '',
            scenarioInstructions: e.scenario_instructions || '',
            characterIds: (e.exercise_characters || [])
              .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
              .map((ec: any) => ec.character_id),
            attachmentUrl: e.attachment_url || null,
            attachmentName: e.attachment_name || null,
            createdAt: e.created_at || new Date().toISOString(),
            updatedAt: e.updated_at || new Date().toISOString(),
          }))
        );
      }

      // 3. Checklists
      const { data: dbChecklists } = await supabase
        .from('checklists')
        .select('*, checklist_exercises(exercise_id), checklist_criteria(*)')
        .order('created_at', { ascending: false });
      if (dbChecklists) {
        setChecklists(
          dbChecklists.map((chk: any) => ({
            id: chk.id,
            title: chk.title || '',
            description: chk.description || '',
            categoryId: chk.category_id || undefined,
            categoryName: chk.category_name || '',
            hasExercises: Boolean(chk.has_exercises),
            exerciseIds: (chk.checklist_exercises || []).map((ce: any) => ce.exercise_id),
            criteria: (chk.checklist_criteria || []).map((crit: any) => ({
              id: crit.id,
              name: crit.name || '',
              weight: Number(crit.weight) || 1,
            })),
            isActive: chk.is_active ?? true,
            createdAt: chk.created_at || new Date().toISOString(),
            updatedAt: chk.updated_at || new Date().toISOString(),
          }))
        );
      }

      // 4. Colaboradores
      const { data: dbCollabs } = await supabase
        .from('collaborators')
        .select('*')
        .order('created_at', { ascending: false });
      if (dbCollabs) {
        setCollaborators(
          dbCollabs.map((col: any) => ({
            id: col.id,
            fullName: col.full_name || '',
            roleTitle: col.role_title || '',
            cellTeam: col.cell_team || '',
            registrationCode: col.registration_code || undefined,
            status: col.status || 'novo',
            createdAt: col.created_at || new Date().toISOString(),
            updatedAt: col.updated_at || new Date().toISOString(),
          }))
        );
      }

      // 5. Atribuições de Checklists
      const { data: dbAsgs } = await supabase
        .from('collaborator_checklists')
        .select('*')
        .order('created_at', { ascending: false });
      if (dbAsgs) {
        setCollaboratorChecklists(
          dbAsgs.map((asg: any) => ({
            id: asg.id,
            collaboratorId: asg.collaborator_id,
            checklistId: asg.checklist_id,
            status: asg.status || 'pendente',
            finalScore: asg.final_score !== null ? Number(asg.final_score) : null,
            criteriaAnswers: Array.isArray(asg.criteria_answers) ? asg.criteria_answers : [],
            generalObservations: asg.general_observations || '',
            instructorAuxiliarId: asg.instructor_auxiliar_id || null,
            actorAuxiliarId: asg.actor_auxiliar_id || null,
            completedAt: asg.completed_at || null,
            createdAt: asg.created_at || new Date().toISOString(),
            updatedAt: asg.updated_at || new Date().toISOString(),
          }))
        );
      }

      // 6. Categorias
      const { data: dbCats } = await supabase.from('categories').select('*');
      if (dbCats) {
        setCategories(dbCats);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados com Supabase:', err);
    }
  }, []);

  React.useEffect(() => {
    if (isSupabaseConfigured) {
      fetchAllFromSupabase();
    }
  }, [fetchAllFromSupabase]);

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

  // 1. Novo Sistema de Autenticação Corporativa baseada em Usuário (nome.sobrenome)
  const loginWithUsername = useCallback(
    (usernameInput: string, passwordInput?: string): LoginResult => {
      const cleanUsername = usernameInput.trim().toLowerCase();
      if (!cleanUsername) {
        return { success: false, message: 'Informe seu usuário corporativo (ex: nome.sobrenome).' };
      }

      const target = users.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername ||
          u.email.toLowerCase() === cleanUsername
      );

      if (!target) {
        return {
          success: false,
          message: 'Usuário não encontrado. Verifique a grafia ou solicite o primeiro acesso.',
        };
      }

      // Validação de Status no Login:
      // A. Se estiver pendente de aprovação
      if (target.status === 'pendente_aprovacao') {
        return {
          success: false,
          status: 'pendente_aprovacao',
          user: target,
          message: 'Seu cadastro ainda aguarda aprovação de um Administrador.',
        };
      }

      // B. Se estiver bloqueado
      if (target.status === 'bloqueado' || !target.isActive) {
        return {
          success: false,
          status: 'bloqueado',
          user: target,
          message: 'Acesso bloqueado pela administração.',
        };
      }

      // C. Se estiver aprovado sem senha (primeiro acesso)
      if (target.status === 'aprovado_sem_senha') {
        return {
          success: false,
          status: 'aprovado_sem_senha',
          user: target,
          message: 'Acesso liberado! Redirecionando para definir sua senha corporativa...',
        };
      }

      // D. Se estiver ativo: conferir senha se fornecida e usuário possui senha salva
      if (target.password && passwordInput !== undefined) {
        if (passwordInput !== target.password) {
          return {
            success: false,
            status: target.status,
            user: target,
            message: 'Senha incorreta. Verifique suas credenciais.',
          };
        }
      }

      setCurrentUserId(target.id);
      appendAudit(
        'Login Efetuado',
        'Autenticação',
        `Sessão iniciada como ${target.fullName} (@${target.username})`,
        'Sucesso',
        target
      );
      return {
        success: true,
        status: target.status,
        user: target,
        message: `Bem-vindo(a), ${target.fullName}!`,
      };
    },
    [users, appendAudit]
  );

  // Fallback para login por email
  const loginWithEmail = useCallback(
    (email: string, passwordInput?: string): MutationResult => {
      const res = loginWithUsername(email, passwordInput);
      return { success: res.success, message: res.message };
    },
    [loginWithUsername]
  );

  // Solicitar Primeiro Acesso
  const requestAccess = useCallback(
    async (fullName: string, requestedUsername: string): Promise<MutationResult> => {
      if (!fullName.trim()) {
        return { success: false, message: 'Por favor, informe seu Nome Completo.' };
      }
      const cleanUsername = requestedUsername
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '.');

      if (!cleanUsername) {
        return { success: false, message: 'Por favor, informe o usuário desejado (nome.sobrenome).' };
      }

      if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
        return {
          success: false,
          message: 'Este nome de usuário já está cadastrado ou em análise.',
        };
      }

      const nowIso = new Date().toISOString();
      const newUser: UserProfile = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        fullName: fullName.trim(),
        email: `${cleanUsername}@portaldesempenho.corp`,
        role: 'auxiliar',
        status: 'pendente_aprovacao',
        canChangePassword: false,
        isActive: false,
        department: 'Operações e Atendimento',
        individualPermissions: [],
        createdAt: nowIso,
        lastLoginAt: '',
      };

      setUsers((prev) => [...prev, newUser]);
      appendAudit(
        'Solicitação de Primeiro Acesso',
        'Autenticação',
        `Solicitação de ${newUser.fullName} (@${newUser.username}) enviada para aprovação`,
        'Sucesso',
        newUser
      );

      return {
        success: true,
        message:
          'Solicitação enviada com sucesso! Seu acesso está aguardando liberação de um Administrador. Assim que for liberado, você poderá definir sua senha neste portal.',
      };
    },
    [users, appendAudit]
  );

  // Definir ou Alterar Senha (apenas permitido quando status: 'aprovado_sem_senha' ou can_change_password: true)
  const setPassword = useCallback(
    async (usernameInput: string, newPassword: string): Promise<MutationResult> => {
      const cleanUsername = usernameInput.trim().toLowerCase();
      if (!newPassword || newPassword.length < 4) {
        return { success: false, message: 'A senha deve conter pelo menos 4 caracteres.' };
      }

      const target = users.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername ||
          u.email.toLowerCase() === cleanUsername
      );

      if (!target) {
        return { success: false, message: 'Usuário não encontrado.' };
      }

      if (target.status !== 'aprovado_sem_senha' && !target.canChangePassword) {
        return {
          success: false,
          message: 'Você não possui permissão para definir ou alterar sua senha no momento. Contate um Administrador.',
        };
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? {
                ...u,
                password: newPassword,
                status: 'ativo',
                isActive: true,
                canChangePassword: false,
                lastLoginAt: new Date().toISOString(),
              }
            : u
        )
      );

      setCurrentUserId(target.id);
      appendAudit(
        'Senha Cadastrada',
        'Autenticação',
        `Senha definida por ${target.fullName} (@${target.username}). Conta ativada.`,
        'Sucesso',
        target
      );

      return {
        success: true,
        message: 'Senha cadastrada com sucesso! Bem-vindo(a) ao Portal de Desempenho.',
      };
    },
    [users, appendAudit]
  );

  // Ações de Governança do Administrador
  const approveUser = useCallback(
    async (userId: string, role: UserRole): Promise<MutationResult> => {
      const target = users.find((u) => u.id === userId);
      if (!target) return { success: false, message: 'Usuário não encontrado.' };

      const defaultPerms: PermissionKey[] =
        role === 'admin'
          ? [
              'can_manage_collaborators',
              'can_manage_checklists',
              'can_manage_exercises',
              'can_apply_evaluations',
              'users:manage',
              'cells:manage',
            ]
          : role === 'avaliador'
          ? ['can_apply_evaluations']
          : [];

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role,
                status: 'aprovado_sem_senha',
                canChangePassword: true,
                isActive: true,
                individualPermissions: defaultPerms,
              }
            : u
        )
      );

      appendAudit(
        'Aprovação de Usuário',
        'Administração',
        `Acesso de ${target.fullName} (@${target.username}) aprovado como ${role}`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Usuário ${target.fullName} aprovado como ${role}. Agora ele pode definir a senha no primeiro acesso.`,
      };
    },
    [users, appendAudit]
  );

  const rejectOrBlockUser = useCallback(
    async (userId: string): Promise<MutationResult> => {
      const target = users.find((u) => u.id === userId);
      if (!target) return { success: false, message: 'Usuário não encontrado.' };

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                status: 'bloqueado',
                isActive: false,
                canChangePassword: false,
              }
            : u
        )
      );

      appendAudit(
        'Bloqueio / Recusa de Usuário',
        'Administração',
        `Usuário ${target.fullName} (@${target.username}) bloqueado`,
        'Bloqueado'
      );

      return { success: true, message: `Usuário ${target.fullName} foi bloqueado.` };
    },
    [users, appendAudit]
  );

  const unblockUser = useCallback(
    async (userId: string): Promise<MutationResult> => {
      const target = users.find((u) => u.id === userId);
      if (!target) return { success: false, message: 'Usuário não encontrado.' };

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                status: 'ativo',
                isActive: true,
              }
            : u
        )
      );

      appendAudit(
        'Desbloqueio de Usuário',
        'Administração',
        `Usuário ${target.fullName} (@${target.username}) desbloqueado`,
        'Sucesso'
      );

      return { success: true, message: `Usuário ${target.fullName} foi reativado com sucesso.` };
    },
    [users, appendAudit]
  );

  const unlockPasswordChange = useCallback(
    async (userId: string): Promise<MutationResult> => {
      const target = users.find((u) => u.id === userId);
      if (!target) return { success: false, message: 'Usuário não encontrado.' };

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                canChangePassword: true,
              }
            : u
        )
      );

      appendAudit(
        'Liberação de Troca de Senha',
        'Administração',
        `Permissão de troca de senha concedida para ${target.fullName} (@${target.username})`,
        'Sucesso'
      );

      return {
        success: true,
        message: `Troca de senha liberada para ${target.fullName}. O usuário já pode definir uma nova senha no portal.`,
      };
    },
    [users, appendAudit]
  );

  const switchDemoUser = useCallback(
    (userId: string): MutationResult => {
      const target = users.find((u) => u.id === userId);
      if (!target) {
        return { success: false, message: 'Usuário não encontrado para alternância de perfil.' };
      }

      if (target.status === 'bloqueado' || !target.isActive) {
        return {
          success: false,
          message: `O usuário ${target.fullName} está BLOQUEADO/INATIVO no sistema.`,
        };
      }

      setCurrentUserId(target.id);
      appendAudit(
        'Alternância de Sessão',
        'Autenticação',
        `Perfil ativo alterado para ${target.fullName} (${target.role})`,
        'Sucesso',
        target
      );
      return { success: true, message: `Perfil alterado para ${target.fullName}.` };
    },
    [users, appendAudit]
  );

  const logout = useCallback(() => {
    if (currentUser) {
      appendAudit('Logout Efetuado', 'Autenticação', `Sessão encerrada para ${currentUser.fullName}`, 'Sucesso');
    }
    setCurrentUserId(null);
  }, [currentUser, appendAudit]);

  // ==========================================
  // 1. Categorias Padronizadas
  // ==========================================
  const createCategory = useCallback(
    async (payload: {
      name: string;
      type?: CategoryType;
      description?: string;
    }): Promise<MutationResult & { category?: Category }> => {
      const trimmed = payload.name.trim();
      if (!trimmed) {
        return { success: false, message: 'Nome da categoria é obrigatório.' };
      }

      const exists = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        const found = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())!;
        return { success: true, message: 'Categoria já existe.', category: found };
      }

      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: trimmed,
        type: payload.type || 'geral',
        description: payload.description?.trim(),
      };

      setCategories((prev) => [...prev, newCategory]);
      appendAudit('Criação de Categoria', 'Categorias', newCategory.name, 'Sucesso');
      return { success: true, message: 'Categoria cadastrada com sucesso!', category: newCategory };
    },
    [categories, appendAudit]
  );

  // ==========================================
  // 2. Banco de Clientes / Personagens (CRUD)
  // ==========================================
  const saveCharacter = useCallback(
    async (payload: {
      id?: string;
      name: string;
      age: string;
      gender: 'Masculino' | 'Feminino' | 'Outro';
      city: string;
      cardNumber: string;
      customerTier: 'Iniciante' | 'Mediano' | 'Intermediário';
      serviceContext: string;
      temperament: string;
      objectives: string;
      typicalPhrases: string;
      guideAttachmentUrl?: string | null;
      guideAttachmentName?: string | null;
    }): Promise<MutationResult & { characterId?: string }> => {
      if (!checkUserPermission(currentUser, 'can_manage_exercises')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_exercises exigida.' };
      }

      if (!payload.name.trim()) {
        return { success: false, message: 'Nome do cliente é obrigatório.' };
      }

      const nowIso = new Date().toISOString();

      if (payload.id) {
        const updatedChar: Character = {
          id: payload.id,
          name: payload.name.trim(),
          age: payload.age.trim() || '45 anos',
          gender: payload.gender || 'Masculino',
          city: payload.city.trim() || 'São Paulo - SP',
          cardNumber: payload.cardNumber.trim() || '0000.0000.00000-00',
          customerTier: payload.customerTier || 'Mediano',
          serviceContext: payload.serviceContext.trim(),
          temperament: payload.temperament.trim(),
          objectives: payload.objectives.trim(),
          typicalPhrases: payload.typicalPhrases.trim(),
          guideAttachmentUrl: payload.guideAttachmentUrl !== undefined ? payload.guideAttachmentUrl : null,
          guideAttachmentName: payload.guideAttachmentName !== undefined ? payload.guideAttachmentName : null,
          createdAt: nowIso,
        };

        if (isSupabaseConfigured) {
          const { error } = await supabase.from('characters').upsert({
            id: updatedChar.id,
            name: updatedChar.name,
            age: updatedChar.age,
            gender: updatedChar.gender,
            city: updatedChar.city,
            card_number: updatedChar.cardNumber,
            customer_tier: updatedChar.customerTier,
            service_context: updatedChar.serviceContext,
            temperament: updatedChar.temperament,
            objectives: updatedChar.objectives,
            typical_phrases: updatedChar.typicalPhrases,
            guide_attachment_url: updatedChar.guideAttachmentUrl,
            guide_attachment_name: updatedChar.guideAttachmentName,
          });
          if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            alert('Erro ao salvar no banco de dados: ' + error.message);
            return { success: false, message: 'Erro ao salvar no banco: ' + error.message };
          }
        }

        setCharacters((prev) =>
          prev.map((c) => (c.id === payload.id ? { ...c, ...updatedChar } : c))
        );
        appendAudit('Edição de Personagem', 'Personagens', payload.name, 'Sucesso');
        return { success: true, message: 'Cliente atualizado com sucesso!', characterId: payload.id };
      } else {
        const newCharId = `char-${Date.now()}`;
        const newChar: Character = {
          id: newCharId,
          name: payload.name.trim(),
          age: payload.age.trim() || '45 anos',
          gender: payload.gender || 'Masculino',
          city: payload.city.trim() || 'São Paulo - SP',
          cardNumber: payload.cardNumber.trim() || '0000.0000.00000-00',
          customerTier: payload.customerTier || 'Mediano',
          serviceContext: payload.serviceContext.trim(),
          temperament: payload.temperament.trim(),
          objectives: payload.objectives.trim(),
          typicalPhrases: payload.typicalPhrases.trim(),
          guideAttachmentUrl: payload.guideAttachmentUrl || null,
          guideAttachmentName: payload.guideAttachmentName || null,
          createdAt: nowIso,
        };

        if (isSupabaseConfigured) {
          const { error } = await supabase.from('characters').insert({
            id: newChar.id,
            name: newChar.name,
            age: newChar.age,
            gender: newChar.gender,
            city: newChar.city,
            card_number: newChar.cardNumber,
            customer_tier: newChar.customerTier,
            service_context: newChar.serviceContext,
            temperament: newChar.temperament,
            objectives: newChar.objectives,
            typical_phrases: newChar.typicalPhrases,
            guide_attachment_url: newChar.guideAttachmentUrl,
            guide_attachment_name: newChar.guideAttachmentName,
          });
          if (error) {
            console.error('Erro ao criar no Supabase:', error);
            alert('Erro ao cadastrar no banco de dados: ' + error.message);
            return { success: false, message: 'Erro ao cadastrar no banco: ' + error.message };
          }
        }

        setCharacters((prev) => [newChar, ...prev]);
        appendAudit('Criação de Personagem', 'Personagens', newChar.name, 'Sucesso');
        return { success: true, message: 'Cliente cadastrado no Banco de Clientes com sucesso!', characterId: newCharId };
      }
    },
    [currentUser, appendAudit]
  );

  const deleteCharacter = useCallback(
    async (characterId: string): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'can_manage_exercises')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_exercises exigida.' };
      }

      if (isSupabaseConfigured) {
        // Exclusão em cascata: remove vínculos em exercise_characters primeiro
        await supabase.from('exercise_characters').delete().eq('character_id', characterId);
        const { error } = await supabase.from('characters').delete().eq('id', characterId);
        if (error) {
          console.error('Erro ao excluir no Supabase:', error);
          alert('Erro ao excluir do banco de dados: ' + error.message);
          return { success: false, message: 'Erro ao excluir do banco de dados: ' + error.message };
        }
      }

      // Remove dos exercícios associados sem quebrar os exercícios
      setExercises((prev) =>
        prev.map((ex) => ({
          ...ex,
          characterIds: ex.characterIds.filter((cid) => cid !== characterId),
        }))
      );

      setCharacters((prev) => prev.filter((c) => c.id !== characterId));
      appendAudit('Exclusão de Personagem', 'Personagens', `ID: ${characterId}`, 'Sucesso');
      return { success: true, message: 'Cliente removido do Banco de Clientes com sucesso.' };
    },
    [currentUser, appendAudit]
  );

  const uploadClientGuide = useCallback(
    async (file: File): Promise<{ success: boolean; message: string; url?: string; fileName?: string }> => {
      if (!checkUserPermission(currentUser, 'can_manage_exercises')) {
        return { success: false, message: 'Acesso negado para upload de guias de clientes.' };
      }

      const safeName = `cliente_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

      try {
        const { error } = await supabase.storage.from('client-guides').upload(safeName, file, {
          cacheControl: '3600',
          upsert: true,
        });

        if (error) {
          const localUrl = URL.createObjectURL(file);
          return {
            success: true,
            message: 'Guia do cliente preparada para visualização.',
            url: localUrl,
            fileName: file.name,
          };
        }

        const { data: publicData } = supabase.storage.from('client-guides').getPublicUrl(safeName);
        return {
          success: true,
          message: 'Guia de atendimento do cliente anexada com sucesso!',
          url: publicData.publicUrl,
          fileName: file.name,
        };
      } catch {
        const localUrl = URL.createObjectURL(file);
        return {
          success: true,
          message: 'Guia do cliente carregada.',
          url: localUrl,
          fileName: file.name,
        };
      }
    },
    [currentUser]
  );

  // ==========================================
  // 3. Exercícios e Cenários (CRUD com até 4 Clientes)
  // ==========================================
  const saveExercise = useCallback(
    async (payload: {
      id?: string;
      title: string;
      difficulty: 'Iniciante' | 'Mediano' | 'Intermediário';
      categoryId?: string;
      categoryName?: string;
      scenarioInstructions: string;
      characterIds: string[];
      attachmentUrl?: string | null;
      attachmentName?: string | null;
    }): Promise<MutationResult & { exerciseId?: string }> => {
      if (!checkUserPermission(currentUser, 'can_manage_exercises')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_exercises exigida.' };
      }

      if (!payload.title.trim()) {
        return { success: false, message: 'Título do exercício é obrigatório.' };
      }

      // Limita até 4 clientes conforme regra de negócio
      const safeCharacterIds = payload.characterIds.slice(0, 4);
      const nowIso = new Date().toISOString();

      if (payload.id) {
        const updatedEx: Exercise = {
          id: payload.id,
          title: payload.title.trim(),
          difficulty: payload.difficulty || 'Mediano',
          categoryId: payload.categoryId,
          categoryName: payload.categoryName || 'Atendimento SAC',
          scenarioInstructions: payload.scenarioInstructions.trim(),
          characterIds: safeCharacterIds,
          attachmentUrl: payload.attachmentUrl || null,
          attachmentName: payload.attachmentName || null,
          updatedAt: nowIso,
          createdAt: nowIso,
        };

        if (isSupabaseConfigured) {
          const { error } = await supabase.from('exercises').upsert({
            id: updatedEx.id,
            title: updatedEx.title,
            difficulty: updatedEx.difficulty,
            category_id: updatedEx.categoryId || null,
            category_name: updatedEx.categoryName,
            scenario_instructions: updatedEx.scenarioInstructions,
            attachment_url: updatedEx.attachmentUrl,
            attachment_name: updatedEx.attachmentName,
          });
          if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            alert('Erro ao salvar no banco de dados: ' + error.message);
            return { success: false, message: 'Erro ao salvar no banco: ' + error.message };
          }

          await supabase.from('exercise_characters').delete().eq('exercise_id', updatedEx.id);
          if (safeCharacterIds.length > 0) {
            const links = safeCharacterIds.map((cid, idx) => ({
              id: `ec-${updatedEx.id}-${cid}`,
              exercise_id: updatedEx.id,
              character_id: cid,
              order_index: idx + 1,
            }));
            await supabase.from('exercise_characters').insert(links);
          }
        }

        setExercises((prev) =>
          prev.map((ex) => (ex.id === payload.id ? { ...ex, ...updatedEx } : ex))
        );
        appendAudit('Edição de Exercício', 'Exercícios', payload.title, 'Sucesso');
        return { success: true, message: 'Exercício atualizado com sucesso.', exerciseId: payload.id };
      } else {
        const newExId = `ex-${Date.now()}`;
        const newEx: Exercise = {
          id: newExId,
          title: payload.title.trim(),
          difficulty: payload.difficulty || 'Mediano',
          categoryId: payload.categoryId,
          categoryName: payload.categoryName || 'Atendimento SAC',
          scenarioInstructions: payload.scenarioInstructions.trim(),
          characterIds: safeCharacterIds,
          attachmentUrl: payload.attachmentUrl || null,
          attachmentName: payload.attachmentName || null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        if (isSupabaseConfigured) {
          const { error } = await supabase.from('exercises').insert({
            id: newEx.id,
            title: newEx.title,
            difficulty: newEx.difficulty,
            category_id: newEx.categoryId || null,
            category_name: newEx.categoryName,
            scenario_instructions: newEx.scenarioInstructions,
            attachment_url: newEx.attachmentUrl,
            attachment_name: newEx.attachmentName,
          });
          if (error) {
            console.error('Erro ao criar no Supabase:', error);
            alert('Erro ao cadastrar exercício no banco de dados: ' + error.message);
            return { success: false, message: 'Erro ao cadastrar no banco: ' + error.message };
          }

          if (safeCharacterIds.length > 0) {
            const links = safeCharacterIds.map((cid, idx) => ({
              id: `ec-${newEx.id}-${cid}`,
              exercise_id: newEx.id,
              character_id: cid,
              order_index: idx + 1,
            }));
            await supabase.from('exercise_characters').insert(links);
          }
        }

        setExercises((prev) => [newEx, ...prev]);
        appendAudit('Criação de Exercício', 'Exercícios', newEx.title, 'Sucesso');
        return { success: true, message: 'Novo exercício criado com sucesso!', exerciseId: newExId };
      }
    },
    [currentUser, appendAudit]
  );

  const deleteExercise = useCallback(
    async (exerciseId: string): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'can_manage_exercises')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_exercises exigida.' };
      }

      if (isSupabaseConfigured) {
        // Exclusão em cascata: remove vínculos em checklist_exercises e exercise_characters primeiro
        await supabase.from('checklist_exercises').delete().eq('exercise_id', exerciseId);
        await supabase.from('exercise_characters').delete().eq('exercise_id', exerciseId);
        const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
        if (error) {
          console.error('Erro ao excluir no Supabase:', error);
          alert('Erro ao excluir do banco de dados: ' + error.message);
          return { success: false, message: 'Erro ao excluir do banco de dados: ' + error.message };
        }
      }

      // Desvincula dos checklists existentes sem excluir os checklists
      setChecklists((prev) =>
        prev.map((chk) => ({
          ...chk,
          exerciseIds: chk.exerciseIds.filter((eid) => eid !== exerciseId),
          hasExercises: chk.exerciseIds.filter((eid) => eid !== exerciseId).length > 0,
        }))
      );

      setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
      appendAudit('Exclusão de Exercício', 'Exercícios', `ID: ${exerciseId}`, 'Sucesso');
      return { success: true, message: 'Exercício excluído com sucesso.' };
    },
    [currentUser, appendAudit]
  );

  const uploadExerciseGuide = useCallback(
    async (file: File): Promise<{ success: boolean; message: string; url?: string; fileName?: string }> => {
      if (!checkUserPermission(currentUser, 'can_manage_exercises')) {
        return { success: false, message: 'Acesso negado para upload de arquivos.' };
      }

      const safeName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

      try {
        const { error } = await supabase.storage.from('exercise-guides').upload(safeName, file, {
          cacheControl: '3600',
          upsert: true,
        });

        if (error) {
          const localUrl = URL.createObjectURL(file);
          return {
            success: true,
            message: 'Documento preparado para visualização e impressão.',
            url: localUrl,
            fileName: file.name,
          };
        }

        const { data: publicData } = supabase.storage.from('exercise-guides').getPublicUrl(safeName);
        return {
          success: true,
          message: 'Documento enviado com sucesso para o armazenamento seguro.',
          url: publicData.publicUrl,
          fileName: file.name,
        };
      } catch {
        const localUrl = URL.createObjectURL(file);
        return {
          success: true,
          message: 'Documento carregado localmente.',
          url: localUrl,
          fileName: file.name,
        };
      }
    },
    [currentUser]
  );

  // ==========================================
  // 4. Checklists Flexíveis (com ou sem exercícios simulados)
  // ==========================================
  const saveChecklist = useCallback(
    async (payload: {
      id?: string;
      title: string;
      description: string;
      categoryId?: string;
      categoryName?: string;
      hasExercises: boolean;
      exerciseIds: string[];
      criteria: Array<{ id?: string; name: string; weight: number }>;
    }): Promise<MutationResult & { checklistId?: string }> => {
      if (!checkUserPermission(currentUser, 'can_manage_checklists')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_checklists exigida.' };
      }

      if (!payload.title.trim()) {
        return { success: false, message: 'Título do checklist é obrigatório.' };
      }

      if (payload.criteria.length === 0) {
        return { success: false, message: 'Adicione ao menos um critério de avaliação.' };
      }

      const nowIso = new Date().toISOString();
      const formattedCriteria: ChecklistCriterion[] = payload.criteria.map((c, idx) => ({
        id: c.id || `crit-${Date.now()}-${idx}`,
        name: c.name.trim(),
        weight: Number(c.weight) || 1,
      }));

      const hasExercisesReal = payload.hasExercises && payload.exerciseIds.length > 0;

      if (payload.id) {
        const updatedChk: Checklist = {
          id: payload.id,
          title: payload.title.trim(),
          description: payload.description.trim(),
          categoryId: payload.categoryId,
          categoryName: payload.categoryName || 'Atendimento SAC',
          hasExercises: hasExercisesReal,
          exerciseIds: hasExercisesReal ? payload.exerciseIds : [],
          criteria: formattedCriteria,
          isActive: true,
          updatedAt: nowIso,
          createdAt: nowIso,
        };

        if (isSupabaseConfigured) {
          const { error } = await supabase.from('checklists').upsert({
            id: updatedChk.id,
            title: updatedChk.title,
            description: updatedChk.description,
            category_id: updatedChk.categoryId || null,
            category_name: updatedChk.categoryName,
            has_exercises: updatedChk.hasExercises,
            is_active: updatedChk.isActive,
          });
          if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            alert('Erro ao salvar no banco de dados: ' + error.message);
            return { success: false, message: 'Erro ao salvar no banco: ' + error.message };
          }

          await supabase.from('checklist_exercises').delete().eq('checklist_id', updatedChk.id);
          if (updatedChk.exerciseIds.length > 0) {
            const exLinks = updatedChk.exerciseIds.map((eid) => ({
              id: `ce-${updatedChk.id}-${eid}`,
              checklist_id: updatedChk.id,
              exercise_id: eid,
            }));
            await supabase.from('checklist_exercises').insert(exLinks);
          }

          await supabase.from('checklist_criteria').delete().eq('checklist_id', updatedChk.id);
          if (updatedChk.criteria.length > 0) {
            const critLinks = updatedChk.criteria.map((crit) => ({
              id: crit.id,
              checklist_id: updatedChk.id,
              name: crit.name,
              weight: crit.weight,
            }));
            await supabase.from('checklist_criteria').insert(critLinks);
          }
        }

        setChecklists((prev) =>
          prev.map((chk) => (chk.id === payload.id ? { ...chk, ...updatedChk } : chk))
        );
        appendAudit('Edição de Checklist', 'Checklists', payload.title, 'Sucesso');
        return { success: true, message: 'Checklist atualizado com sucesso!', checklistId: payload.id };
      } else {
        const newChkId = `chk-${Date.now()}`;
        const newChk: Checklist = {
          id: newChkId,
          title: payload.title.trim(),
          description: payload.description.trim(),
          categoryId: payload.categoryId,
          categoryName: payload.categoryName || 'Atendimento SAC',
          hasExercises: hasExercisesReal,
          exerciseIds: hasExercisesReal ? payload.exerciseIds : [],
          criteria: formattedCriteria,
          isActive: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        if (isSupabaseConfigured) {
          const { error } = await supabase.from('checklists').insert({
            id: newChk.id,
            title: newChk.title,
            description: newChk.description,
            category_id: newChk.categoryId || null,
            category_name: newChk.categoryName,
            has_exercises: newChk.hasExercises,
            is_active: newChk.isActive,
          });
          if (error) {
            console.error('Erro ao criar no Supabase:', error);
            alert('Erro ao salvar checklist no banco de dados: ' + error.message);
            return { success: false, message: 'Erro ao cadastrar no banco: ' + error.message };
          }

          if (newChk.exerciseIds.length > 0) {
            const exLinks = newChk.exerciseIds.map((eid) => ({
              id: `ce-${newChk.id}-${eid}`,
              checklist_id: newChk.id,
              exercise_id: eid,
            }));
            await supabase.from('checklist_exercises').insert(exLinks);
          }

          if (newChk.criteria.length > 0) {
            const critLinks = newChk.criteria.map((crit) => ({
              id: crit.id,
              checklist_id: newChk.id,
              name: crit.name,
              weight: crit.weight,
            }));
            await supabase.from('checklist_criteria').insert(critLinks);
          }
        }

        setChecklists((prev) => [newChk, ...prev]);
        appendAudit('Criação de Checklist', 'Checklists', newChk.title, 'Sucesso');
        return { success: true, message: 'Checklist salvo com sucesso!', checklistId: newChkId };
      }
    },
    [currentUser, appendAudit]
  );

  const deleteChecklist = useCallback(
    async (checklistId: string): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'can_manage_checklists')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_checklists exigida.' };
      }

      if (isSupabaseConfigured) {
        // Exclusão em cascata: remove vínculos de avaliações, exercícios e critérios primeiro
        await supabase.from('collaborator_checklists').delete().eq('checklist_id', checklistId);
        await supabase.from('checklist_exercises').delete().eq('checklist_id', checklistId);
        await supabase.from('checklist_criteria').delete().eq('checklist_id', checklistId);
        const { error } = await supabase.from('checklists').delete().eq('id', checklistId);
        if (error) {
          console.error('Erro ao excluir no Supabase:', error);
          alert('Erro ao excluir do banco de dados: ' + error.message);
          return { success: false, message: 'Erro ao excluir do banco de dados: ' + error.message };
        }
      }

      // Integridade referencial com ON DELETE CASCADE: remove vínculos de avaliações dos colaboradores
      setCollaboratorChecklists((prev) => prev.filter((c) => c.checklistId !== checklistId));

      setChecklists((prev) => prev.filter((c) => c.id !== checklistId));
      appendAudit('Exclusão de Checklist', 'Checklists', `ID: ${checklistId}`, 'Sucesso');
      return { success: true, message: 'Checklist e seus vínculos foram excluídos com sucesso.' };
    },
    [currentUser, appendAudit]
  );

  // ==========================================
  // 5. Colaboradores & Vínculos (CRUD com Edição)
  // ==========================================
  const createCollaborator = useCallback(
    async (payload: {
      fullName: string;
      roleTitle: string;
      cellTeam: string;
      registrationCode?: string;
      status: CollaboratorStatus;
      initialChecklistIds?: string[];
    }): Promise<MutationResult & { collaboratorId?: string }> => {
      if (!checkUserPermission(currentUser, 'can_manage_collaborators')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_collaborators exigida.' };
      }

      if (!payload.fullName.trim()) {
        return { success: false, message: 'Nome completo é obrigatório.' };
      }

      const nowIso = new Date().toISOString();
      const newCollabId = `col-${Date.now()}`;
      const newCollab: Collaborator = {
        id: newCollabId,
        fullName: payload.fullName.trim(),
        roleTitle: payload.roleTitle.trim() || 'Atendente de Operações',
        cellTeam: payload.cellTeam.trim() || 'Atendimento Corporativo',
        registrationCode: payload.registrationCode?.trim(),
        status: payload.status || 'novo',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setCollaborators((prev) => [newCollab, ...prev]);

      if (payload.initialChecklistIds && payload.initialChecklistIds.length > 0) {
        const newAssignments: CollaboratorChecklist[] = payload.initialChecklistIds.map((chkId, idx) => ({
          id: `asg-${Date.now()}-${idx}`,
          collaboratorId: newCollabId,
          checklistId: chkId,
          status: 'pendente',
          finalScore: null,
          criteriaAnswers: [],
          instructorAuxiliarId: null,
          actorAuxiliarId: null,
          completedAt: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        }));
        setCollaboratorChecklists((prev) => [...newAssignments, ...prev]);
      }

      appendAudit('Cadastro de Colaborador', 'Colaboradores', newCollab.fullName, 'Sucesso');
      return { success: true, message: 'Colaborador cadastrado com sucesso!', collaboratorId: newCollabId };
    },
    [currentUser, appendAudit]
  );

  const updateCollaborator = useCallback(
    async (payload: {
      id: string;
      fullName: string;
      roleTitle: string;
      cellTeam: string;
      registrationCode?: string;
      status: CollaboratorStatus;
    }): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'can_manage_collaborators')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_collaborators exigida.' };
      }

      const nowIso = new Date().toISOString();
      setCollaborators((prev) =>
        prev.map((c) =>
          c.id === payload.id
            ? {
                ...c,
                fullName: payload.fullName.trim(),
                roleTitle: payload.roleTitle.trim(),
                cellTeam: payload.cellTeam.trim(),
                registrationCode: payload.registrationCode?.trim(),
                status: payload.status,
                updatedAt: nowIso,
              }
            : c
        )
      );

      appendAudit('Edição de Colaborador', 'Colaboradores', payload.fullName, 'Sucesso');
      return { success: true, message: 'Colaborador editado com sucesso!' };
    },
    [currentUser, appendAudit]
  );

  const deleteCollaborator = useCallback(
    async (collaboratorId: string): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'can_manage_collaborators')) {
        return { success: false, message: 'Acesso negado: permissão can_manage_collaborators exigida.' };
      }

      setCollaboratorChecklists((prev) => prev.filter((a) => a.collaboratorId !== collaboratorId));
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      appendAudit('Exclusão de Colaborador', 'Colaboradores', `ID: ${collaboratorId}`, 'Sucesso');
      return { success: true, message: 'Colaborador excluído com sucesso.' };
    },
    [currentUser, appendAudit]
  );

  const updateCollaboratorChecklistAssignments = useCallback(
    async (collaboratorId: string, checklistIds: string[]): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'can_manage_collaborators')) {
        return { success: false, message: 'Acesso negado para gerenciar vínculos.' };
      }

      const nowIso = new Date().toISOString();

      setCollaboratorChecklists((prev) => {
        // Mantém checklists existentes que ainda estão marcados
        const preserved = prev.filter(
          (asg) => asg.collaboratorId !== collaboratorId || checklistIds.includes(asg.checklistId)
        );

        // Adiciona os novos checklists marcados
        const existingChkIds = new Set(
          prev.filter((asg) => asg.collaboratorId === collaboratorId).map((a) => a.checklistId)
        );

        const newEntries: CollaboratorChecklist[] = checklistIds
          .filter((chkId) => !existingChkIds.has(chkId))
          .map((chkId, idx) => ({
            id: `asg-${Date.now()}-${idx}`,
            collaboratorId,
            checklistId: chkId,
            status: 'pendente',
            finalScore: null,
            criteriaAnswers: [],
            instructorAuxiliarId: null,
            actorAuxiliarId: null,
            completedAt: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          }));

        return [...preserved, ...newEntries];
      });

      appendAudit('Vínculos de Checklists Atualizados', 'Colaboradores', `Colaborador: ${collaboratorId}`, 'Sucesso');
      return { success: true, message: 'Vínculos atualizados com sucesso!' };
    },
    [currentUser, appendAudit]
  );

  // ==========================================
  // 6. Condução e Execução de Avaliação
  // ==========================================
  const completeEvaluation = useCallback(
    async (payload: {
      collaboratorChecklistId: string;
      instructorAuxiliarId?: string | null;
      actorAuxiliarId?: string | null;
      criteriaAnswers: CriteriaAnswerSnapshot[];
      finalScore: number;
      generalObservations?: string;
      updateCollaboratorStatus?: CollaboratorStatus;
    }): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'can_apply_evaluations')) {
        return { success: false, message: 'Acesso negado: permissão can_apply_evaluations exigida.' };
      }

      const targetAssignment = collaboratorChecklists.find(
        (c) => c.id === payload.collaboratorChecklistId
      );
      if (!targetAssignment) {
        return { success: false, message: 'Atribuição de avaliação não encontrada.' };
      }

      const nowIso = new Date().toISOString();

      setCollaboratorChecklists((prev) =>
        prev.map((c) =>
          c.id === payload.collaboratorChecklistId
            ? {
                ...c,
                instructorAuxiliarId: payload.instructorAuxiliarId || c.instructorAuxiliarId,
                actorAuxiliarId: payload.actorAuxiliarId || c.actorAuxiliarId,
                status: 'concluido',
                finalScore: payload.finalScore,
                criteriaAnswers: payload.criteriaAnswers,
                generalObservations: payload.generalObservations !== undefined ? payload.generalObservations : c.generalObservations,
                completedAt: nowIso,
                updatedAt: nowIso,
              }
            : c
        )
      );

      if (payload.updateCollaboratorStatus) {
        setCollaborators((prev) =>
          prev.map((col) =>
            col.id === targetAssignment.collaboratorId
              ? {
                  ...col,
                  status: payload.updateCollaboratorStatus!,
                  updatedAt: nowIso,
                }
              : col
          )
        );
      }

      // Persistência no Supabase (se configurado)
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('collaborator_checklists')
            .update({
              instructor_auxiliar_id: payload.instructorAuxiliarId || null,
              actor_auxiliar_id: payload.actorAuxiliarId || null,
              status: 'concluido',
              final_score: payload.finalScore,
              criteria_answers: payload.criteriaAnswers,
              general_observations: payload.generalObservations || null,
              completed_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', payload.collaboratorChecklistId);

          if (payload.updateCollaboratorStatus) {
            await supabase
              .from('collaborators')
              .update({
                status: payload.updateCollaboratorStatus,
                updated_at: nowIso,
              })
              .eq('id', targetAssignment.collaboratorId);
          }
        } catch (err) {
          console.warn('Erro ao sincronizar avaliação no Supabase:', err);
        }
      }

      appendAudit(
        'Conclusão de Avaliação',
        'Avaliações',
        `Nota ${payload.finalScore.toFixed(1)} registrada para o colaborador ID: ${targetAssignment.collaboratorId}`,
        'Sucesso'
      );
      return { success: true, message: 'Avaliação concluída e registrada com sucesso!' };
    },
    [currentUser, collaboratorChecklists, appendAudit]
  );

  // ==========================================
  // 7. Governança e Usuários
  // ==========================================
  const updateUserPermissions = useCallback(
    async (payload: {
      targetUserId: string;
      role: UserRole;
      isActive: boolean;
      individualPermissions: PermissionKey[];
    }): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'users:manage')) {
        return { success: false, message: 'Acesso negado: permissão users:manage exigida.' };
      }

      const targetUser = users.find((u) => u.id === payload.targetUserId);
      if (!targetUser) {
        return { success: false, message: 'Usuário não localizado.' };
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === payload.targetUserId
            ? {
                ...u,
                role: payload.role,
                isActive: payload.isActive,
                individualPermissions: payload.individualPermissions,
              }
            : u
        )
      );

      appendAudit(
        'Atualização de Permissões',
        'Administração',
        `Permissões de ${targetUser.fullName} atualizadas`,
        'Sucesso'
      );
      return { success: true, message: 'Permissões do usuário atualizadas com sucesso.' };
    },
    [currentUser, users, appendAudit]
  );

  const createNewUser = useCallback(
    async (payload: {
      fullName: string;
      email: string;
      role: UserRole;
      department: string;
      individualPermissions: PermissionKey[];
    }): Promise<MutationResult> => {
      if (!checkUserPermission(currentUser, 'users:manage')) {
        return { success: false, message: 'Acesso negado: permissão users:manage exigida.' };
      }

      const normalized = payload.email.trim().toLowerCase();
      if (users.some((u) => u.email.toLowerCase() === normalized)) {
        return { success: false, message: 'Já existe um usuário cadastrado com este e-mail.' };
      }

      const usernameCandidate = normalized.split('@')[0].toLowerCase().replace(/\s+/g, '.');
      const nowIso = new Date().toISOString();
      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        username: usernameCandidate,
        fullName: payload.fullName.trim(),
        email: normalized,
        role: payload.role,
        status: 'ativo',
        canChangePassword: false,
        department: payload.department.trim() || 'Operações',
        isActive: true,
        individualPermissions: payload.individualPermissions,
        createdAt: nowIso,
        lastLoginAt: nowIso,
      };

      setUsers((prev) => [...prev, newUser]);
      appendAudit('Criação de Usuário', 'Administração', newUser.fullName, 'Sucesso');
      return { success: true, message: 'Novo usuário criado com sucesso.' };
    },
    [currentUser, users, appendAudit]
  );

  const value = useMemo(
    () => ({
      currentUser,
      users,
      loginWithUsername,
      loginWithEmail,
      requestAccess,
      setPassword,
      approveUser,
      rejectOrBlockUser,
      unblockUser,
      unlockPasswordChange,
      switchDemoUser,
      logout,
      hasPermission,
      categories,
      cells,
      criteria,
      characters,
      exercises,
      checklists,
      collaborators,
      collaboratorChecklists,
      auditLogs,
      createCategory,
      saveCharacter,
      deleteCharacter,
      uploadClientGuide,
      saveExercise,
      deleteExercise,
      uploadExerciseGuide,
      saveChecklist,
      deleteChecklist,
      createCollaborator,
      updateCollaborator,
      deleteCollaborator,
      updateCollaboratorChecklistAssignments,
      completeEvaluation,
      updateUserPermissions,
      createNewUser,
    }),
    [
      currentUser,
      users,
      loginWithUsername,
      loginWithEmail,
      requestAccess,
      setPassword,
      approveUser,
      rejectOrBlockUser,
      unblockUser,
      unlockPasswordChange,
      switchDemoUser,
      logout,
      hasPermission,
      categories,
      cells,
      criteria,
      characters,
      exercises,
      checklists,
      collaborators,
      collaboratorChecklists,
      auditLogs,
      createCategory,
      saveCharacter,
      deleteCharacter,
      uploadClientGuide,
      saveExercise,
      deleteExercise,
      uploadExerciseGuide,
      saveChecklist,
      deleteChecklist,
      createCollaborator,
      updateCollaborator,
      deleteCollaborator,
      updateCollaboratorChecklistAssignments,
      completeEvaluation,
      updateUserPermissions,
      createNewUser,
    ]
  );

  return <PortalStoreContext.Provider value={value}>{children}</PortalStoreContext.Provider>;
};

export function usePortalStore(): PortalStoreContextValue {
  const context = useContext(PortalStoreContext);
  if (!context) {
    throw new Error('usePortalStore deve ser utilizado dentro de um PortalStoreProvider.');
  }
  return context;
}
