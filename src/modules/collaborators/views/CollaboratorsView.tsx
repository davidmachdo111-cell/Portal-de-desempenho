import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  Play,
  Award,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  FileText,
  UserCheck,
  X,
  SlidersHorizontal,
  Trash2,
  User,
  Eye,
  Printer,
  Calendar,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import {
  Collaborator,
  CollaboratorStatus,
  Exercise,
  Checklist,
  Character,
  CollaboratorChecklist,
} from '../../../types/portal';
import { CUSTOMER_TIER_BADGES } from '../../characters/views/CharactersManagementView';
import { DIFFICULTY_BADGES } from '../../exercises/views/ExercisesSimulationView';

interface CollaboratorsViewProps {
  initialCollaboratorId?: string | null;
  onStartEvaluation: (assignmentId: string, collaboratorId?: string) => void;
}

const STATUS_BADGES: Record<CollaboratorStatus, { label: string; style: string }> = {
  novo: { label: 'Novo', style: 'bg-blue-100 text-blue-800 border-blue-200' },
  em_treinamento: { label: 'Em Treinamento', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  aprovado: { label: 'Aprovado', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  necessita_reforco: { label: 'Necessita Reforço', style: 'bg-red-100 text-red-800 border-red-200' },
};

export const CollaboratorsView: React.FC<CollaboratorsViewProps> = ({
  initialCollaboratorId,
  onStartEvaluation,
}) => {
  const {
    collaborators,
    cells,
    checklists,
    collaboratorChecklists,
    exercises,
    characters,
    users,
    currentUser,
    hasPermission,
    createCollaborator,
    deleteCollaborator,
    updateCollaboratorChecklistAssignments,
  } = usePortalStore();

  const isAuxiliar = currentUser?.role === 'auxiliar';
  const canApplyEvaluations = hasPermission('can_apply_evaluations') && !isAuxiliar;
  const canManageCollaborators = hasPermission('can_manage_collaborators');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [activeCollaboratorId, setActiveCollaboratorId] = useState<string | null>(
    initialCollaboratorId || null
  );

  useEffect(() => {
    if (initialCollaboratorId) {
      setActiveCollaboratorId(initialCollaboratorId);
    }
  }, [initialCollaboratorId]);

  const handlePrintReport = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.print();
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedBriefingExercise, setSelectedBriefingExercise] = useState<Exercise | null>(null);

  // Modal do Laudo Oficial de Impressão
  const [printReportModalAssignment, setPrintReportModalAssignment] =
    useState<CollaboratorChecklist | null>(null);

  const [deleteConfirmCollaborator, setDeleteConfirmCollaborator] = useState<Collaborator | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados do formulário de criação
  const [newFullName, setNewFullName] = useState('');
  const [newRegCode, setNewRegCode] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('Atendente de Operações');
  const [newCellTeam, setNewCellTeam] = useState(cells[0]?.name || 'Atendimento Corporativo');
  const [newStatus, setNewStatus] = useState<CollaboratorStatus>('novo');
  const [initialChecklistId, setInitialChecklistId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtro de listagem
  const filteredCollaborators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return collaborators.filter((col) => {
      if (selectedStatusFilter !== 'all' && col.status !== selectedStatusFilter) return false;
      if (!q) return true;
      return (
        col.fullName.toLowerCase().includes(q) ||
        col.roleTitle.toLowerCase().includes(q) ||
        col.cellTeam.toLowerCase().includes(q) ||
        (col.registrationCode && col.registrationCode.toLowerCase().includes(q))
      );
    });
  }, [collaborators, searchQuery, selectedStatusFilter]);

  const activeCollaborator = useMemo(
    () => collaborators.find((c) => c.id === activeCollaboratorId) || null,
    [collaborators, activeCollaboratorId]
  );

  // Checklists atribuídos ao colaborador ativo
  const activeAssignments = useMemo(() => {
    if (!activeCollaborator) return [];
    return collaboratorChecklists.filter((c) => c.collaboratorId === activeCollaborator.id);
  }, [collaboratorChecklists, activeCollaborator]);

  // Exercícios vinculados aos checklists atribuídos ao colaborador
  const activeLinkedExercises = useMemo(() => {
    if (!activeCollaborator) return [];
    const exerciseIdSet = new Set<string>();

    activeAssignments.forEach((asg) => {
      const chk = checklists.find((c) => c.id === asg.checklistId);
      if (chk && chk.exerciseIds) {
        chk.exerciseIds.forEach((id) => exerciseIdSet.add(id));
      }
    });

    return Array.from(exerciseIdSet)
      .map((exId) => exercises.find((e) => e.id === exId))
      .filter(Boolean) as Exercise[];
  }, [activeCollaborator, activeAssignments, checklists, exercises]);

  // Estados temporários do modal de gerenciar vínculos
  const [tempAssignedChecklistIds, setTempAssignedChecklistIds] = useState<string[]>([]);

  const openLinksManager = () => {
    if (!activeCollaborator) return;
    const currentChkIds = activeAssignments.map((a) => a.checklistId);
    setTempAssignedChecklistIds(currentChkIds);
    setShowLinksModal(true);
  };

  const handleToggleChecklistLink = (chkId: string) => {
    setTempAssignedChecklistIds((prev) =>
      prev.includes(chkId) ? prev.filter((id) => id !== chkId) : [...prev, chkId]
    );
  };

  const handleSaveLinks = async () => {
    if (!activeCollaborator) return;
    setIsSubmitting(true);
    const res = await updateCollaboratorChecklistAssignments(
      activeCollaborator.id,
      tempAssignedChecklistIds
    );
    setIsSubmitting(false);

    if (res.success) {
      setShowLinksModal(false);
      setFeedback({ type: 'success', text: 'Vínculos de checklists atualizados com sucesso!' });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleRemoveSingleAssignment = async (checklistIdToRemove: string) => {
    if (!activeCollaborator) return;
    const updatedIds = activeAssignments
      .map((a) => a.checklistId)
      .filter((id) => id !== checklistIdToRemove);
    const res = await updateCollaboratorChecklistAssignments(activeCollaborator.id, updatedIds);
    if (res.success) {
      setFeedback({ type: 'success', text: 'Checklist desvinculado com sucesso!' });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleCreateCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      setFeedback({ type: 'error', text: 'Informe o nome completo do colaborador.' });
      return;
    }

    setIsSubmitting(true);
    const res = await createCollaborator({
      fullName: newFullName.trim(),
      registrationCode: newRegCode.trim() || undefined,
      cellTeam: newCellTeam.trim(),
      roleTitle: newRoleTitle.trim(),
      status: newStatus,
      initialChecklistIds: initialChecklistId ? [initialChecklistId] : [],
    });
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', text: 'Colaborador cadastrado com sucesso!' });
      setShowCreateModal(false);
      setNewFullName('');
      setNewRegCode('');
      if (res.collaboratorId) {
        setActiveCollaboratorId(res.collaboratorId);
      }
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmCollaborator) return;
    const res = await deleteCollaborator(deleteConfirmCollaborator.id);
    const targetId = deleteConfirmCollaborator.id;
    setDeleteConfirmCollaborator(null);
    if (res.success) {
      setFeedback({ type: 'success', text: 'Colaborador removido com sucesso.' });
      if (activeCollaboratorId === targetId) {
        setActiveCollaboratorId(null);
      }
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // Helper para dados do Laudo de Impressão
  const printReportData = useMemo(() => {
    if (!printReportModalAssignment || !activeCollaborator) return null;
    const chk = checklists.find((c) => c.id === printReportModalAssignment.checklistId);
    if (!chk) return null;

    const instructor = users.find(
      (u) => u.id === printReportModalAssignment.instructorAuxiliarId
    );

    const linkedExerciseList = (chk.exerciseIds || [])
      .map((eid) => exercises.find((e) => e.id === eid))
      .filter(Boolean) as Exercise[];

    const linkedCharacterList: Character[] = [];
    linkedExerciseList.forEach((ex) => {
      ex.characterIds.forEach((cid) => {
        const found = characters.find((c) => c.id === cid);
        if (found && !linkedCharacterList.some((c) => c.id === found.id)) {
          linkedCharacterList.push(found);
        }
      });
    });

    const isApproved =
      activeCollaborator.status === 'aprovado' ||
      (typeof printReportModalAssignment.finalScore === 'number' &&
        printReportModalAssignment.finalScore >= 7);

    return {
      assignment: printReportModalAssignment,
      collaborator: activeCollaborator,
      checklist: chk,
      instructorName: instructor?.fullName || 'Instrutor / Avaliador Oficial',
      evaluationDate: printReportModalAssignment.completedAt
        ? new Date(printReportModalAssignment.completedAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date().toLocaleDateString('pt-BR'),
      exercises: linkedExerciseList,
      characters: linkedCharacterList,
      isApproved,
    };
  }, [printReportModalAssignment, activeCollaborator, checklists, users, exercises, characters]);

  return (
    <div className={`space-y-6 ${printReportData ? 'print:hidden' : ''}`}>
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-sm shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5 font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODO FICHA COMPLETA DO COLABORADOR COM GERENCIADOR DE VÍNCULOS */}
      {/* ======================================================== */}
      {activeCollaborator ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Voltar para a listagem */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveCollaboratorId(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0f3e2e] bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Lista de Colaboradores</span>
            </button>

            {canManageCollaborators && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openLinksManager}
                  className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Gerenciar Vínculos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCollaborator(activeCollaborator)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Excluir Colaborador"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Cartão de Identificação do Colaborador */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#0f3e2e] flex items-center justify-center font-display font-bold text-xl shrink-0">
                {activeCollaborator.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold font-display text-slate-900">
                    {activeCollaborator.fullName}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[11px] border whitespace-nowrap shrink-0 ${
                      STATUS_BADGES[activeCollaborator.status].style
                    }`}
                  >
                    {STATUS_BADGES[activeCollaborator.status].label}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Cargo: <strong>{activeCollaborator.roleTitle}</strong>
                  </span>
                  <span>
                    Setor/Célula: <strong>{activeCollaborator.cellTeam}</strong>
                  </span>
                  {activeCollaborator.registrationCode && (
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      Matrícula: {activeCollaborator.registrationCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Resumo de Avaliações */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Avaliações Vinculadas</div>
                <div className="text-lg font-bold font-mono text-slate-900">
                  {activeAssignments.length} checklist(s)
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Exercícios na Trilha</div>
                <div className="text-lg font-bold font-mono text-emerald-800">
                  {activeLinkedExercises.length} caso(s)
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 1: CHECKLISTS DE AVALIAÇÃO ATRIBUÍDOS AO COLABORADOR */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>Checklists de Avaliação Atribuídos</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Checklists disponíveis para conduzir a simulação ou ver notas anteriores
                </p>
              </div>
            </div>

            {activeAssignments.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                Nenhum checklist atribuído a este colaborador no momento.
                {canManageCollaborators && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={openLinksManager}
                      className="px-4 py-2 font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg cursor-pointer"
                    >
                      Vincular Checklist de Avaliação
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeAssignments.map((asg) => {
                  const chk = checklists.find((c) => c.id === asg.checklistId);
                  if (!chk) return null;

                  const isCompleted = asg.status === 'concluido';
                  const isPending = asg.status === 'pendente';

                  return (
                    <div
                      key={asg.id}
                      className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-4.5 flex flex-col justify-between shadow-2xs transition-all space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                            {chk.categoryName || 'Geral'}
                          </span>
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isCompleted ? 'Concluído' : isPending ? 'Pendente' : 'Em Andamento'}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm">{chk.title}</h3>
                        <p className="text-[11px] text-slate-600 line-clamp-2">
                          {chk.description || 'Avaliação operacional de atendimento.'}
                        </p>

                        <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                          <span>{chk.criteria.length} critérios</span>
                          <span>·</span>
                          <span>
                            {chk.hasExercises ? `${chk.exerciseIds.length} exercício(s)` : 'Sem exercícios'}
                          </span>
                        </div>
                      </div>

                      {/* Nota e Ações: Iniciar e Imprimir */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {isCompleted && typeof asg.finalScore === 'number' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">Nota:</span>
                            <span className="text-base font-bold font-mono text-emerald-800">
                              {asg.finalScore.toFixed(1)} / 10
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Aguardando aplicação
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {/* Botão de Relatório de Impressão */}
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => setPrintReportModalAssignment(asg)}
                              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              title="Visualizar e Imprimir Relatório Oficial"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span className="hidden sm:inline">Imprimir Relatório</span>
                            </button>
                          )}

                          {/* Botão Iniciar / Reavaliar: Oculto para perfil auxiliar */}
                          {canApplyEvaluations && (
                            <button
                              type="button"
                              onClick={() => onStartEvaluation(asg.id, activeCollaborator?.id)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isCompleted ? 'Reavaliar' : 'Iniciar'}</span>
                            </button>
                          )}

                          {canManageCollaborators && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSingleAssignment(chk.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Desvincular checklist deste colaborador"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 2: EXERCÍCIOS E CLIENTES VINCULADOS (ROTEIRO) */}
          {/* ========================================================= */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Cenários de Simulação Vinculados aos Checklists</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Casos práticos de simulação que o colaborador enfrentará nestas avaliações
              </p>
            </div>

            {activeLinkedExercises.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                Os checklists vinculados a este colaborador não possuem exercícios de simulação anexados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeLinkedExercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-white border border-slate-200 rounded-xl p-4.5 flex flex-col justify-between shadow-2xs space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                          Dificuldade: {ex.difficulty || 'Mediano'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {ex.characterIds.length} cliente(s)
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{ex.title}</h3>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {ex.scenarioInstructions}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedBriefingExercise(ex)}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Roteiro</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* MODO LISTAGEM GERAL DE COLABORADORES (TABELA + CADASTRO) */
        /* ======================================================== */
        <div className="space-y-6">
          {/* Header Corporativo do Módulo */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Módulo 1 · Gestão de Pessoas</span>
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                Colaboradores em Treinamento
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Acompanhe o desenvolvimento individual, status de aprovação, histórico de notas e gerencie as trilhas de treinamento e simulação.
              </p>
            </div>

            {canManageCollaborators && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo Colaborador</span>
              </button>
            )}
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, cargo ou matrícula..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-600">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos os Status</option>
                <option value="novo">Novo</option>
                <option value="em_treinamento">Em Treinamento</option>
                <option value="aprovado">Aprovado</option>
                <option value="necessita_reforco">Necessita Reforço</option>
              </select>
            </div>
          </div>

          {/* Tabela de Colaboradores */}
          {filteredCollaborators.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Colaborador</th>
                    <th className="px-5 py-3.5">Célula / Setor</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Trilha Atribuída</th>
                    <th className="px-5 py-3.5 text-center">Nota Mais Recente</th>
                    <th className="px-5 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCollaborators.map((col) => {
                    const assignments = collaboratorChecklists.filter(
                      (c) => c.collaboratorId === col.id
                    );
                    const completedAsg = assignments.find((c) => c.status === 'concluido');
                    const latestAsg = assignments[0];
                    const chk = latestAsg
                      ? checklists.find((c) => c.id === latestAsg.checklistId)
                      : null;

                    return (
                      <tr key={col.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setActiveCollaboratorId(col.id)}
                            className="font-bold text-slate-900 hover:text-emerald-800 text-sm text-left cursor-pointer"
                          >
                            {col.fullName}
                          </button>
                          <div className="text-slate-500 text-[11px]">
                            {col.roleTitle}{' '}
                            {col.registrationCode && `· Matrícula: ${col.registrationCode}`}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {col.cellTeam || 'Geral'}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[11px] border whitespace-nowrap shrink-0 ${
                              STATUS_BADGES[col.status].style
                            }`}
                          >
                            {STATUS_BADGES[col.status].label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {assignments.length > 0 ? (
                            <span className="font-medium text-slate-800">
                              {chk ? chk.title : `${assignments.length} checklist(s)`}
                              {assignments.length > 1 && (
                                <span className="text-[10px] text-emerald-800 ml-1 font-bold">
                                  (+{assignments.length - 1})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sem trilha</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {completedAsg && typeof completedAsg.finalScore === 'number' ? (
                            <span className="font-mono font-bold text-sm text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              {completedAsg.finalScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">---</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveCollaboratorId(col.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Abrir Ficha</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">Nenhum colaborador encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                Cadastre o primeiro colaborador para atribuir checklists e simular atendimentos.
              </p>
              {canManageCollaborators && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-colors cursor-pointer"
                >
                  Cadastrar Primeiro Colaborador
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: GERENCIADOR DE VÍNCULOS (CHECKLISTS) */}
      {/* ========================================================= */}
      {showLinksModal && activeCollaborator && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-[#0f3e2e] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base">Gerenciar Vínculos de Avaliação</h3>
                <p className="text-[11px] text-emerald-200">
                  Colaborador: {activeCollaborator.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLinksModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  Selecione os Checklists que Compõem a Trilha
                </h4>
                <p className="text-[11px] text-slate-500">
                  Marque os checklists que este colaborador precisará cumprir durante sua formação.
                </p>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {checklists.map((chk) => {
                  const isChecked = tempAssignedChecklistIds.includes(chk.id);
                  return (
                    <label
                      key={chk.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleChecklistLink(chk.id)}
                        className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{chk.title}</span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {chk.categoryName || 'Geral'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {chk.description || 'Critérios de atendimento padronizado.'}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>{chk.criteria.length} critérios</span>
                          <span>·</span>
                          <span>
                            {chk.hasExercises
                              ? `${chk.exerciseIds.length} caso(s) simulado(s)`
                              : 'Sem exercício'}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                {tempAssignedChecklistIds.length} checklist(s) selecionado(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinksModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveLinks}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Salvar Vínculos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ROTEIRO DO ATENDIMENTO (ROLEPLAY) */}
      {/* ========================================================= */}
      {selectedBriefingExercise && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-[#0f3e2e] text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Roteiro do Atendimento · Dificuldade {selectedBriefingExercise.difficulty || 'Mediano'}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedBriefingExercise.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#0f3e2e] bg-white hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Baixar Roteiro em PDF ou Imprimir"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>📄 Baixar Roteiro (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBriefingExercise(null)}
                  className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="printable-roteiro" className="p-6 overflow-y-auto space-y-4 text-xs font-sans print:p-8">
              {/* Cabeçalho impresso oficial */}
              <div className="hidden print:block border-b-2 border-emerald-900 pb-3 mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Portal de Desempenho & Desenvolvimento Operacional
                </div>
                <h1 className="text-xl font-black text-slate-900 mt-0.5">
                  ROTEIRO DE ATENDIMENTO SIMULADO
                </h1>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                  <span><strong>Caso:</strong> {selectedBriefingExercise.title}</span>
                  <span>•</span>
                  <span><strong>Dificuldade:</strong> {selectedBriefingExercise.difficulty || 'Mediano'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-800 uppercase text-[10px]">
                  Roteiro de Atuação e Instruções do Caso:
                </span>
                <p className="text-slate-700 mt-1 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-medium">
                  {selectedBriefingExercise.scenarioInstructions}
                </p>
              </div>

              {/* Clientes Vinculados a Este Exercício */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800 uppercase text-[10px]">
                  Clientes a Serem Interpretados ({selectedBriefingExercise.characterIds.length}):
                </span>
                {selectedBriefingExercise.characterIds.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-500">
                    Nenhum cliente cadastrado neste exercício.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedBriefingExercise.characterIds.map((charId) => {
                      const char = characters.find((c) => c.id === charId);
                      if (!char) return null;
                      const tierBadge =
                        CUSTOMER_TIER_BADGES[char.customerTier || 'Mediano'] ||
                        CUSTOMER_TIER_BADGES['Mediano'];

                      return (
                        <div
                          key={char.id}
                          className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5 print:bg-white print:border-slate-300 print:break-inside-avoid"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-950 text-xs">
                              {char.name} ({char.age})
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}
                            >
                              {tierBadge.label}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600">
                            <strong>Carteirinha:</strong> {char.cardNumber} ·{' '}
                            <strong>Cidade:</strong> {char.city}
                          </div>

                          <p className="text-slate-700 leading-relaxed text-[11px]">
                            <strong>Contexto:</strong> {char.serviceContext || char.history}
                          </p>

                          <p className="text-slate-700 leading-relaxed text-[11px]">
                            <strong>Humor:</strong> {char.temperament}
                          </p>

                          <p className="text-slate-700 leading-relaxed text-[11px]">
                            <strong>Objetivo:</strong> {char.objectives}
                          </p>

                          {char.typicalPhrases && (
                            <div className="bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-200/60 text-slate-700 italic text-[11px] whitespace-pre-line">
                              {char.typicalPhrases
                                .split('\n')
                                .map((l) => l.trim().replace(/^["'“”«»]+|["'“”«»,]+$/g, '').trim())
                                .filter(Boolean)
                                .map((l) => `"${l}"`)
                                .join('\n')}
                            </div>
                          )}

                          {char.guideAttachmentUrl && (
                            <div className="pt-1">
                              <a
                                href={char.guideAttachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Abrir Guia Anexa do Cliente</span>
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBriefingExercise(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer text-xs"
              >
                Fechar Roteiro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RELATÓRIO OFICIAL DE AVALIAÇÃO / IMPRESSÃO */}
      {/* ========================================================= */}
      {printReportData && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:z-[99999] print:block print:overflow-visible">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] print:max-h-none print:my-0 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:block print:overflow-visible">
            {/* Header da Barra de Ações (Oculta na impressão real) */}
            <div className="px-6 py-4 bg-[#0f3e2e] text-white flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base text-white">
                    Relatório Oficial de Avaliação de Desempenho
                  </h3>
                  <span className="text-xs text-emerald-200">
                    Documento consolidado pronto para impressão ou salvar em PDF
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-4 py-1.5 text-xs font-bold text-[#0f3e2e] bg-white hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Relatório</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintReportModalAssignment(null)}
                  className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Documento Imprimível Formal */}
            <div
              id="printable-report"
              className="p-8 overflow-y-auto space-y-6 flex-1 text-slate-900 font-sans print:p-8 print:m-0 print:overflow-visible print:block print:bg-white print:text-black"
            >
              {/* 1. Cabeçalho Oficial */}
              <div className="border-b-2 border-emerald-900 pb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Portal de Desempenho & Desenvolvimento Operacional
                  </div>
                  <h1 className="text-xl font-black text-slate-900 mt-0.5">
                    RELATÓRIO DE AVALIAÇÃO PRÁTICA E SIMULAÇÃO
                  </h1>
                  <span className="text-xs text-slate-500 font-medium">
                    Certificado de Verificação de Competências e Atendimento
                  </span>
                </div>

                <div className="text-right text-xs space-y-0.5">
                  <div className="font-bold text-slate-700">Data de Emissão:</div>
                  <div className="font-mono text-slate-900">{printReportData.evaluationDate}</div>
                  <div className="text-[10px] text-slate-400">Doc ID: {printReportData.assignment.id}</div>
                </div>
              </div>

              {/* 2. Dados do Colaborador e Avaliação */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Colaborador
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {printReportData.collaborator.fullName}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Cargo / Função
                  </span>
                  <span className="font-medium text-slate-800">
                    {printReportData.collaborator.roleTitle}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Célula / Equipe
                  </span>
                  <span className="font-medium text-slate-800">
                    {printReportData.collaborator.cellTeam}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Matrícula
                  </span>
                  <span className="font-mono font-medium text-slate-800">
                    {printReportData.collaborator.registrationCode || 'N/A'}
                  </span>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Checklist Aplicado
                  </span>
                  <span className="font-bold text-emerald-950">
                    {printReportData.checklist.title}
                  </span>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Instrutor Responsável
                  </span>
                  <span className="font-medium text-slate-800">
                    {printReportData.instructorName}
                  </span>
                </div>
              </div>

              {/* 3. Cenários e Clientes Interpretados na Simulação */}
              {printReportData.characters.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Cenários e Clientes Simulados</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {printReportData.characters.map((char) => (
                      <div
                        key={char.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{char.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {char.customerTier}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Carteirinha: {char.cardNumber} · {char.city}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                          "{char.serviceContext || char.history}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Tabela de Critérios Avaliados */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Detalhamento de Critérios Avaliados & Observações
                </h4>
                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 border-b border-slate-200 w-12 text-center">Status</th>
                      <th className="p-2.5 border-b border-slate-200">Critério de Avaliação</th>
                      <th className="p-2.5 border-b border-slate-200 w-16 text-center">Peso</th>
                      <th className="p-2.5 border-b border-slate-200">Observações do Instrutor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printReportData.assignment.criteriaAnswers &&
                    printReportData.assignment.criteriaAnswers.length > 0 ? (
                      printReportData.assignment.criteriaAnswers.map((ans, idx) => (
                        <tr key={idx} className={ans.checked ? 'bg-white' : 'bg-red-50/30'}>
                          <td className="p-2.5 text-center">
                            {ans.checked ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-800 font-bold text-xs">
                                ✕
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-medium text-slate-800">{ans.name}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-600">
                            {ans.weight || 1}
                          </td>
                          <td className="p-2.5 text-slate-600 italic">
                            {ans.notes ? ans.notes : '---'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      printReportData.checklist.criteria.map((crit, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 text-center">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                              ✓
                            </span>
                          </td>
                          <td className="p-2.5 font-medium text-slate-800">{crit.name}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-600">
                            {crit.weight}
                          </td>
                          <td className="p-2.5 text-slate-400 italic">Atendido conforme padrão.</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 5. Observações Gerais do Avaliador */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Observações Gerais do Avaliador</span>
                </h4>
                {printReportData.assignment.generalObservations ? (
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-white p-3 rounded-lg border border-slate-200">
                    {printReportData.assignment.generalObservations}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-white p-3 rounded-lg border border-slate-200">
                    Nenhuma observação geral complementar registrada nesta avaliação.
                  </p>
                )}
              </div>

              {/* 6. Resultado Final & Parecer Oficial */}
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Parecer Oficial da Avaliação
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-black px-4 py-1.5 rounded-xl border ${
                        printReportData.isApproved
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-red-100 text-red-900 border-red-300'
                      }`}
                    >
                      {printReportData.isApproved ? 'APROVADO' : 'NECESSITA REFORÇO'}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {printReportData.isApproved
                        ? 'Apto para o fluxo operacional padrão.'
                        : 'Recomenda-se reciclagem nos critérios não atendidos.'}
                    </span>
                  </div>
                </div>

                <div className="text-center sm:text-right bg-white px-5 py-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nota Consolidada
                  </span>
                  <div className="text-3xl font-black font-mono text-[#0f3e2e]">
                    {typeof printReportData.assignment.finalScore === 'number'
                      ? printReportData.assignment.finalScore.toFixed(1)
                      : '10.0'}{' '}
                    <span className="text-base text-slate-400 font-normal">/ 10</span>
                  </div>
                </div>
              </div>

              {/* Rodapé Oficial Limpo: Data, Status e Nota Consolidada (Sem Assinaturas) */}
              <div className="pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
                <div className="text-[11px]">
                  Data e Hora do Registro:{' '}
                  <strong className="text-slate-800">{printReportData.evaluationDate}</strong>
                </div>
                <div className="flex items-center gap-3 font-medium text-xs">
                  <span>
                    Status Final:{' '}
                    <strong
                      className={
                        printReportData.isApproved
                          ? 'text-emerald-700 uppercase font-bold'
                          : 'text-red-700 uppercase font-bold'
                      }
                    >
                      {printReportData.isApproved ? 'Aprovado' : 'Necessita Reforço'}
                    </strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>
                    Nota Consolidada:{' '}
                    <strong className="font-mono text-slate-900 font-bold">
                      {typeof printReportData.assignment.finalScore === 'number'
                        ? printReportData.assignment.finalScore.toFixed(1)
                        : '10.0'}{' '}
                      / 10
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => setPrintReportModalAssignment(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handlePrintReport}
                className="px-5 py-2 font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Relatório</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NOVO COLABORADOR */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4.5 bg-[#0f3e2e] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Novo Colaborador em Treinamento</h3>
                <p className="text-[11px] text-emerald-200">
                  Preencha os dados e selecione o checklist de partida
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollaborator} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Gabriela Menezes Souza"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Matrícula (Opcional)</label>
                  <input
                    type="text"
                    value={newRegCode}
                    onChange={(e) => setNewRegCode(e.target.value)}
                    placeholder="Ex: COL-204"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Status Inicial</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as CollaboratorStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  >
                    <option value="novo">Novo</option>
                    <option value="em_treinamento">Em Treinamento</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="necessita_reforco">Necessita Reforço</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Cargo / Função *</label>
                  <input
                    type="text"
                    required
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="Ex: Atendente de Operações"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Célula / Equipe *</label>
                  <select
                    value={newCellTeam}
                    onChange={(e) => setNewCellTeam(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  >
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.name}>
                        {cell.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-200">
                <label className="block font-bold text-slate-800">
                  Checklist Inicial da Trilha (Opcional)
                </label>
                <select
                  value={initialChecklistId}
                  onChange={(e) => setInitialChecklistId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                >
                  <option value="">Nenhum checklist no momento</option>
                  {checklists.map((chk) => (
                    <option key={chk.id} value={chk.id}>
                      {chk.title} ({chk.categoryName || 'Geral'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0f3e2e] hover:bg-emerald-900 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirmCollaborator && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Excluir &ldquo;{deleteConfirmCollaborator.fullName}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Este colaborador será removido do sistema juntamente com seus vínculos de avaliação.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCollaborator(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
