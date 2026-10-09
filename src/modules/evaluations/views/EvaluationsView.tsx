import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  ShieldAlert,
  Save,
  CheckSquare,
} from 'lucide-react';
import {
  calculateWeightedScore,
  usePortalStore,
} from '../../../context/PortalStoreContext';
import { Evaluation, EvaluationSnapshotItem } from '../../../types/portal';

export const EvaluationsView: React.FC = () => {
  const {
    evaluations,
    collaborators,
    cells,
    exercises,
    users,
    hasPermission,
    validateCellEligibility,
    createEvaluationDraft,
    saveEvaluationProgress,
  } = usePortalStore();

  const canCreateEvaluation = hasPermission('evaluations:create');
  const canViewEvaluation = hasPermission('evaluations:view');

  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>(
    evaluations[0]?.id || ''
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Formulário para iniciar nova avaliação
  const [newCollabId, setNewCollabId] = useState<string>(collaborators[0]?.id || '');
  const [newExerciseId, setNewExerciseId] = useState<string>(exercises[0]?.id || '');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const selectedCollabForNew = useMemo(
    () => collaborators.find((c) => c.id === newCollabId) || null,
    [collaborators, newCollabId]
  );

  const selectedCellEligibility = useMemo(() => {
    if (!selectedCollabForNew) return { eligible: false, reason: 'Selecione um colaborador.' };
    return validateCellEligibility(selectedCollabForNew.cellId);
  }, [selectedCollabForNew, validateCellEligibility]);

  const filteredEvaluations = useMemo(
    () =>
      evaluations.filter((ev) =>
        statusFilter === 'all' ? true : ev.status === statusFilter
      ),
    [evaluations, statusFilter]
  );

  const activeEvaluation = useMemo(
    () =>
      evaluations.find((ev) => ev.id === selectedEvaluationId) ||
      filteredEvaluations[0] ||
      null,
    [evaluations, selectedEvaluationId, filteredEvaluations]
  );

  if (!canViewEvaluation) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">
          Acesso Restrito ao Módulo de Avaliações
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Seu perfil atual não possui a permissão <code>evaluations:view</code>. Solicite ao
          Administrador uma permissão individual caso precise auditar ou consultar avaliações.
        </p>
      </div>
    );
  }

  const handleStartNewEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createEvaluationDraft({
      collaboratorId: newCollabId,
      exerciseId: newExerciseId,
    });
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    if (res.success && res.evaluationId) {
      setSelectedEvaluationId(res.evaluationId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Qualidade Operacional · Snapshot Imutável de Critérios
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Checklists e Avaliações de Colaboradores
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Aplique avaliações baseadas nos critérios vinculados ao exercício. A preparação do
            checklist exige que a célula do colaborador possua Padrão de Atendimento homologado.
          </p>
        </div>
      </div>

      {/* Feedback de Operação */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Painel de Preparação de Novo Checklist (com validação em tempo real do Padrão da Célula) */}
      {canCreateEvaluation && (
        <form
          onSubmit={handleStartNewEvaluation}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Preparar Novo Checklist de Avaliação</span>
            </h2>
            <span className="text-xs text-slate-500">
              Regra institucional: Validação automática de Padrão de Atendimento da Célula
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Colaborador Avaliado
              </label>
              <select
                value={newCollabId}
                onChange={(e) => setNewCollabId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              >
                {collaborators.map((col) => {
                  const cell = cells.find((c) => c.id === col.cellId);
                  return (
                    <option key={col.id} value={col.id}>
                      {col.registrationCode} — {col.fullName} ({cell?.code}{' '}
                      {cell?.hasServiceStandard ? '· Homologada' : '· SEM PADRÃO'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Exercício de Referência (Checklist Mestre)
              </label>
              <select
                value={newExerciseId}
                onChange={(e) => setNewExerciseId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.code} — {ex.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full px-4 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap"
              >
                Iniciar Checklist
              </button>
            </div>
          </div>

          {/* Alerta se a célula do colaborador selecionado não possuir Padrão de Atendimento */}
          {!selectedCellEligibility.eligible && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{selectedCellEligibility.reason}</span>
            </div>
          )}
        </form>
      )}

      {/* Listagem e Editor de Avaliação */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista Lateral de Avaliações */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
          <div className="p-3 bg-slate-50 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">
              Histórico de Avaliações
            </span>
            <div className="flex items-center gap-1">
              {(['all', 'in_progress', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                    statusFilter === st
                      ? 'bg-[#0f3e2e] text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all'
                    ? 'Todas'
                    : st === 'in_progress'
                    ? 'Em Andamento'
                    : 'Concluídas'}
                </button>
              ))}
            </div>
          </div>

          {filteredEvaluations.map((ev) => {
            const col = collaborators.find((c) => c.id === ev.collaboratorId);
            const ex = exercises.find((e) => e.id === ev.exerciseId);
            const isSelected = activeEvaluation?.id === ev.id;

            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedEvaluationId(ev.id)}
                className={`w-full text-left p-4 transition-colors space-y-1 ${
                  isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="font-bold text-emerald-800">{ev.code}</span>
                  <span
                    className={
                      ev.status === 'completed'
                        ? 'text-emerald-800 font-semibold'
                        : 'text-amber-700 font-semibold'
                    }
                  >
                    {ev.status === 'completed'
                      ? `Concluída · Nota ${ev.finalScore?.toFixed(2)}`
                      : 'Em Andamento'}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {col?.fullName || 'Colaborador'}
                </div>
                <div className="text-xs text-slate-500">
                  {ex?.code} · {ev.criteriaSnapshot.length} critérios no snapshot
                </div>
              </button>
            );
          })}
        </div>

        {/* Painel Principal da Avaliação Selecionada */}
        <div className="lg:col-span-8">
          {activeEvaluation ? (
            <EvaluationDetailEditor
              key={activeEvaluation.id}
              evaluation={activeEvaluation}
              collaboratorName={
                collaborators.find((c) => c.id === activeEvaluation.collaboratorId)
                  ?.fullName || ''
              }
              cellName={
                cells.find((c) => c.id === activeEvaluation.cellId)?.name || ''
              }
              evaluatorName={
                users.find((u) => u.id === activeEvaluation.evaluatorId)?.fullName || ''
              }
              exerciseTitle={
                exercises.find((e) => e.id === activeEvaluation.exerciseId)?.title || ''
              }
              canEdit={canCreateEvaluation && activeEvaluation.status === 'in_progress'}
              onSave={async (items, generalFeedback, finalize) => {
                const res = await saveEvaluationProgress(
                  activeEvaluation.id,
                  items,
                  generalFeedback,
                  finalize
                );
                setFeedback({
                  type: res.success ? 'success' : 'error',
                  text: res.message,
                });
              }}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
              Selecione uma avaliação para inspecionar ou preencher.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EvaluationDetailEditor: React.FC<{
  evaluation: Evaluation;
  collaboratorName: string;
  cellName: string;
  evaluatorName: string;
  exerciseTitle: string;
  canEdit: boolean;
  onSave: (
    items: EvaluationSnapshotItem[],
    generalFeedback: string,
    finalize: boolean
  ) => Promise<void>;
}> = ({
  evaluation,
  collaboratorName,
  cellName,
  evaluatorName,
  exerciseTitle,
  canEdit,
  onSave,
}) => {
  const [items, setItems] = useState<EvaluationSnapshotItem[]>(() =>
    evaluation.criteriaSnapshot.map((i) => ({ ...i }))
  );
  const [generalFeedback, setGeneralFeedback] = useState(
    evaluation.generalFeedback || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const liveWeightedScore = useMemo(() => calculateWeightedScore(items), [items]);

  const updateItemScore = (criterionId: string, nextScore: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.criterionId === criterionId
          ? { ...item, score: Math.max(0, Math.min(10, nextScore)) }
          : item
      )
    );
  };

  const updateItemNotes = (criterionId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.criterionId === criterionId ? { ...item, notes } : item
      )
    );
  };

  const handleAction = async (finalize: boolean) => {
    setIsSaving(true);
    try {
      await onSave(items, generalFeedback, finalize);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      {/* Cabeçalho da Avaliação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-mono tabular-nums text-emerald-800 font-semibold">
            {evaluation.code} ·{' '}
            {evaluation.status === 'completed'
              ? 'AVALIAÇÃO CONCLUÍDA (SNAPSHOT IMUTÁVEL)'
              : 'AVALIAÇÃO EM ANDAMENTO'}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            {collaboratorName}
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Célula: {cellName} · Avaliador: {evaluatorName}
          </div>
          <div className="text-xs font-medium text-slate-700 mt-1">
            {exerciseTitle}
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-xl text-right shrink-0">
          <div className="text-[11px] text-slate-300">Média Ponderada</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {(evaluation.status === 'completed' && evaluation.finalScore !== null
              ? evaluation.finalScore
              : liveWeightedScore
            ).toFixed(2)}
            <span className="text-xs text-slate-400 font-normal"> / 10,00</span>
          </div>
        </div>
      </div>

      {evaluation.status === 'completed' && (
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-700">
          <Lock className="w-4 h-4 text-slate-600 shrink-0" />
          <span>
            <strong>Proteção Retroativa Ativa:</strong> Os critérios e pesos abaixo foram
            congelados no snapshot desta avaliação em{' '}
            {new Date(evaluation.completedAt!).toLocaleString('pt-BR')}. Alterações futuras na
            matriz do Checklist Mestre não alteram esta pontuação.
          </span>
        </div>
      )}

      {/* Itens do Checklist */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.criterionId}
            className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-mono tabular-nums text-slate-500">
                  <span className="font-bold text-emerald-800">{item.criterionCode}</span> ·{' '}
                  {item.sectionName} · Peso {item.weight}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {item.criterionName}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-semibold text-slate-700">
                  Nota (0 a 10):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  disabled={!canEdit}
                  value={item.score}
                  onChange={(e) =>
                    updateItemScore(item.criterionId, Number(e.target.value))
                  }
                  className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-mono tabular-nums text-right font-bold text-slate-900 disabled:bg-slate-100"
                />
              </div>
            </div>

            <input
              type="text"
              disabled={!canEdit}
              value={item.notes}
              onChange={(e) => updateItemNotes(item.criterionId, e.target.value)}
              placeholder="Evidências observadas pelo avaliador neste critério..."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 disabled:bg-slate-100"
            />
          </div>
        ))}
      </div>

      {/* Parecer Geral */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Parecer Consolidado e Plano de Ação
        </label>
        <textarea
          rows={3}
          disabled={!canEdit}
          value={generalFeedback}
          onChange={(e) => setGeneralFeedback(e.target.value)}
          placeholder="Registre o feedback estruturado para o colaborador..."
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-100"
        />
      </div>

      {/* Botões de Ação */}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleAction(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar em Andamento</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleAction(true)}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Concluir Avaliação e Gravar Snapshot</span>
          </button>
        </div>
      )}
    </div>
  );
};
