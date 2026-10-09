import React, { useMemo, useState } from 'react';
import { CheckSquare, Square, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Criterion, Exercise } from '../../../types/portal';

interface CriteriaBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  allCriteria: Criterion[];
  initialLinkedIds: string[];
  onSaveLinks: (exerciseId: string, nextCriteriaIds: string[]) => Promise<{ success: boolean; message: string }>;
}

/**
 * Wrapper que garante montagem atômica via `key={exercise.id}`.
 * Isso elimina na raiz o bug histórico em que o salvamento de um exercício
 * sobrescrevia os vínculos de outro exercício sem fechar/reabrir o modal.
 */
export const CriteriaBindingModal: React.FC<CriteriaBindingModalProps> = ({
  isOpen,
  onClose,
  exercise,
  allCriteria,
  initialLinkedIds,
  onSaveLinks,
}) => {
  if (!isOpen || !exercise) return null;

  return (
    <CriteriaBindingModalInner
      key={exercise.id}
      exercise={exercise}
      allCriteria={allCriteria}
      initialLinkedIds={initialLinkedIds}
      onClose={onClose}
      onSaveLinks={onSaveLinks}
    />
  );
};

const CriteriaBindingModalInner: React.FC<{
  exercise: Exercise;
  allCriteria: Criterion[];
  initialLinkedIds: string[];
  onClose: () => void;
  onSaveLinks: (exerciseId: string, nextCriteriaIds: string[]) => Promise<{ success: boolean; message: string }>;
}> = ({ exercise, allCriteria, initialLinkedIds, onClose, onSaveLinks }) => {
  const [selectedSet, setSelectedSet] = useState<Set<string>>(
    () => new Set(initialLinkedIds)
  );
  const [baselineSet, setBaselineSet] = useState<Set<string>>(
    () => new Set(initialLinkedIds)
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    if (selectedSet.size !== baselineSet.size) return true;
    for (const id of selectedSet) {
      if (!baselineSet.has(id)) return true;
    }
    return false;
  }, [selectedSet, baselineSet]);

  const groupedSections = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    const map = new Map<string, { sectionName: string; criteria: Criterion[] }>();

    for (const crit of allCriteria) {
      if (!crit.isActive) continue;
      if (
        query &&
        !crit.name.toLowerCase().includes(query) &&
        !crit.code.toLowerCase().includes(query) &&
        !crit.sectionName.toLowerCase().includes(query)
      ) {
        continue;
      }
      if (!map.has(crit.sectionId)) {
        map.set(crit.sectionId, { sectionName: crit.sectionName, criteria: [] });
      }
      map.get(crit.sectionId)!.criteria.push(crit);
    }

    return Array.from(map.entries());
  }, [allCriteria, searchFilter]);

  const toggleCriterion = (criterionId: string) => {
    setFeedback(null);
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(criterionId)) {
        next.delete(criterionId);
      } else {
        next.add(criterionId);
      }
      return next;
    });
  };

  const toggleSectionAll = (sectionCriteria: Criterion[], shouldSelect: boolean) => {
    setFeedback(null);
    setSelectedSet((prev) => {
      const next = new Set(prev);
      for (const c of sectionCriteria) {
        if (shouldSelect) {
          next.add(c.id);
        } else {
          next.delete(c.id);
        }
      }
      return next;
    });
  };

  const toggleAllCriteria = (shouldSelect: boolean) => {
    setFeedback(null);
    if (shouldSelect) {
      setSelectedSet(new Set(allCriteria.filter((c) => c.isActive).map((c) => c.id)));
    } else {
      setSelectedSet(new Set());
    }
  };

  const handleRequestClose = () => {
    if (hasUnsavedChanges && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const nextIds = Array.from(selectedSet);
      const result = await onSaveLinks(exercise.id, nextIds);
      if (!result.success) {
        setFeedback({ type: 'error', text: result.message });
      } else {
        setBaselineSet(new Set(nextIds));
        setFeedback({ type: 'success', text: result.message });
        setTimeout(() => {
          onClose();
        }, 350);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="binding-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-emerald-800">
              Vincular Critérios ao Exercício · {exercise.code}
            </div>
            <h2
              id="binding-modal-title"
              className="text-lg font-bold text-slate-900 mt-0.5"
            >
              {exercise.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Fechar modal"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtro e Seleção em Massa */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrar critério por código, nome completo ou seção..."
            className="flex-1 min-w-[240px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAllCriteria(true)}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Selecionar Todos ({allCriteria.length})
            </button>
            <button
              type="button"
              onClick={() => toggleAllCriteria(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Limpar Seleção
            </button>
          </div>
        </div>

        {/* Alerta de confirmação de descarte */}
        {confirmDiscard && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Existem alterações de vínculo não salvas para {exercise.code}. Deseja descartá-las?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Continuar Editando
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
              >
                Descartar e Sair
              </button>
            </div>
          </div>
        )}

        {/* Feedback de operação */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg border flex items-center gap-2 text-sm font-medium ${
              feedback.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Lista de Critérios por Seção com Nome Completo */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {groupedSections.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Nenhum critério encontrado para o filtro informado.
            </div>
          ) : (
            groupedSections.map(([sectionId, group]) => {
              const selectedInSection = group.criteria.filter((c) =>
                selectedSet.has(c.id)
              ).length;
              const allSectionSelected =
                group.criteria.length > 0 &&
                selectedInSection === group.criteria.length;

              return (
                <div
                  key={sectionId}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {group.sectionName}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        · {selectedInSection}/{group.criteria.length} vinculados
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleSectionAll(group.criteria, !allSectionSelected)
                      }
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 px-2.5 py-1 rounded hover:bg-emerald-100/60 transition-colors whitespace-nowrap shrink-0"
                    >
                      {allSectionSelected
                        ? 'Desmarcar Seção'
                        : 'Selecionar Todos da Seção'}
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.criteria.map((criterion) => {
                      const isChecked = selectedSet.has(criterion.id);
                      return (
                        <label
                          key={criterion.id}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
                            isChecked
                              ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCriterion(criterion.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                              <span className="font-semibold text-slate-700">
                                {criterion.code}
                              </span>
                              <span>·</span>
                              <span>Peso {criterion.weight}</span>
                            </div>
                            <div className="text-sm font-medium text-slate-900 mt-0.5 leading-snug">
                              {criterion.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {criterion.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 rounded-b-xl">
          <div className="text-xs text-slate-600 font-mono tabular-nums">
            Total selecionado para <strong>{exercise.code}</strong>:{' '}
            <strong>{selectedSet.size}</strong> de {allCriteria.length} critérios
            {hasUnsavedChanges && (
              <span className="ml-2 text-amber-700 font-sans font-semibold">
                · Alterações pendentes de salvamento
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              {isSaving ? 'Salvando Vínculos...' : 'Salvar Vínculos do Exercício'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
