import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Square,
  SlidersHorizontal,
  Plus,
  Search,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import { Criterion, Exercise } from '../../../types/portal';
import { CriteriaBindingModal } from '../components/CriteriaBindingModal';

export const MasterChecklistMatrixView: React.FC = () => {
  const {
    sections,
    criteria,
    exercises,
    exerciseCriteriaLinks,
    hasPermission,
    getCriteriaIdsForExercise,
    saveExerciseCriteriaLinks,
    toggleSingleMatrixLink,
    setSectionCriteriaForExercise,
    createNewCriterion,
  } = usePortalStore();

  const canManageMatrix = hasPermission('master_checklist:manage');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Modal de novo critério
  const [showNewCriterionModal, setShowNewCriterionModal] = useState(false);
  const [newCritForm, setNewCritForm] = useState({
    sectionId: sections[0]?.id || 'sec-01',
    code: '',
    name: '',
    description: '',
    weight: 2,
  });

  // Ordena os 10 exercícios por orderIndex
  const orderedExercises = useMemo(
    () => [...exercises].sort((a, b) => a.orderIndex - b.orderIndex),
    [exercises]
  );

  // Lookup rápido O(1) para interseção (exerciseId + criterionId)
  const linkLookupSet = useMemo(() => {
    const set = new Set<string>();
    for (const lnk of exerciseCriteriaLinks) {
      set.add(`${lnk.exerciseId}::${lnk.criterionId}`);
    }
    return set;
  }, [exerciseCriteriaLinks]);

  // Contadores reais baseados exclusivamente nos vínculos existentes
  const exerciseLinkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of orderedExercises) {
      counts[ex.id] = 0;
    }
    for (const lnk of exerciseCriteriaLinks) {
      if (counts[lnk.exerciseId] !== undefined) {
        counts[lnk.exerciseId] += 1;
      }
    }
    return counts;
  }, [orderedExercises, exerciseCriteriaLinks]);

  const criterionLinkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const crit of criteria) {
      counts[crit.id] = 0;
    }
    for (const lnk of exerciseCriteriaLinks) {
      if (counts[lnk.criterionId] !== undefined) {
        counts[lnk.criterionId] += 1;
      }
    }
    return counts;
  }, [criteria, exerciseCriteriaLinks]);

  // Agrupamento de critérios por seção respeitando filtros
  const groupedSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sections
      .filter((sec) => selectedSectionFilter === 'all' || sec.id === selectedSectionFilter)
      .map((sec) => {
        const secCriteria = criteria.filter((c) => {
          if (c.sectionId !== sec.id || !c.isActive) return false;
          if (!q) return true;
          return (
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q)
          );
        });
        return {
          section: sec,
          criteria: secCriteria,
        };
      })
      .filter((group) => group.criteria.length > 0);
  }, [sections, criteria, searchQuery, selectedSectionFilter]);

  const handleToggleCell = async (exerciseId: string, criterionId: string) => {
    const res = await toggleSingleMatrixLink(exerciseId, criterionId);
    setStatusBanner({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleToggleSectionColumn = async (
    exerciseId: string,
    sectionId: string,
    sectionCriteria: Criterion[]
  ) => {
    const allLinked = sectionCriteria.every((c) =>
      linkLookupSet.has(`${exerciseId}::${c.id}`)
    );
    const res = await setSectionCriteriaForExercise(
      exerciseId,
      sectionId,
      !allLinked
    );
    setStatusBanner({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleCreateCriterionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createNewCriterion(newCritForm);
    setStatusBanner({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    if (res.success) {
      setShowNewCriterionModal(false);
      setNewCritForm({
        sectionId: sections[0]?.id || 'sec-01',
        code: '',
        name: '',
        description: '',
        weight: 2,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Governança de Avaliação · Fonte Única de Verdade
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Checklist Mestre e Matriz de Vínculos
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Gerencie a matriz oficial entre as 4 seções de critérios e os 10 exercícios de desenvolvimento.
            A edição direta na grade e o modal “Vincular Critérios” compartilham o mesmo estado transacional.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canManageMatrix ? (
            <button
              type="button"
              onClick={() => setShowNewCriterionModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Critério</span>
            </button>
          ) : (
            <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-600">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Modo Leitura (Permissão master_checklist:manage exigida para edição)</span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback de Mutação */}
      {statusBanner && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 text-sm ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-semibold underline opacity-75 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Barra de Filtros, Pesquisa e Acesso Rápido ao Modal por Exercício */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar critério por código (ex: CR-1.2) ou nome completo..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedSectionFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedSectionFilter === 'all'
                  ? 'bg-[#0f3e2e] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas as Seções ({sections.length})
            </button>
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSectionFilter(sec.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedSectionFilter === sec.id
                    ? 'bg-[#0f3e2e] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sec.code}
              </button>
            ))}
          </div>
        </div>

        {/* Seletor Direto para abrir o Modal "Vincular Critérios" de qualquer um dos 10 Exercícios */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
            <span>Vincular Critérios por Exercício (Modal Isolado):</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {orderedExercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setModalExercise(ex)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-md transition-colors font-mono tabular-nums whitespace-nowrap shrink-0"
              >
                {ex.code} ({exerciseLinkCounts[ex.id] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grade da Matriz de Critérios com Cabeçalho Fixo e Primeira Coluna Fixa */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white border-b border-slate-800">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-900 px-4 py-3.5 min-w-[360px] max-w-[420px] text-xs font-semibold border-r border-slate-800">
                  <div className="flex items-center justify-between">
                    <span>Critério de Avaliação (Nome Completo)</span>
                    <span className="font-mono tabular-nums text-emerald-300">
                      Total: {criteria.length} critérios
                    </span>
                  </div>
                </th>
                <th className="px-3 py-3.5 text-center text-xs font-semibold w-20 border-r border-slate-800 font-mono tabular-nums">
                  Peso
                </th>
                {orderedExercises.map((ex) => (
                  <th
                    key={ex.id}
                    className="px-2.5 py-3 text-center min-w-[92px] border-r border-slate-800 last:border-r-0"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono tabular-nums text-xs font-bold text-white">
                        {ex.code}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-emerald-300">
                        {exerciseLinkCounts[ex.id] || 0}/{criteria.length}
                      </span>
                      {canManageMatrix && (
                        <button
                          type="button"
                          onClick={() => setModalExercise(ex)}
                          className="mt-0.5 px-2 py-0.5 text-[10px] font-medium bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 rounded transition-colors whitespace-nowrap"
                        >
                          Vincular
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3.5 text-center text-xs font-semibold w-24 bg-slate-900 font-mono tabular-nums">
                  Exercícios
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-sm">
              {groupedSections.map(({ section, criteria: secCriteria }) => (
                <React.Fragment key={section.id}>
                  {/* Linha de Cabeçalho da Seção com Seleção em Massa por Seção/Exercício */}
                  <tr className="bg-slate-100/90 border-y border-slate-200">
                    <td className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 font-semibold text-slate-900 text-xs border-r border-slate-200">
                      <div className="flex items-center justify-between">
                        <span>{section.name}</span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {secCriteria.length} critérios
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs text-slate-400 border-r border-slate-200">
                      Seção
                    </td>
                    {orderedExercises.map((ex) => {
                      const linkedInSec = secCriteria.filter((c) =>
                        linkLookupSet.has(`${ex.id}::${c.id}`)
                      ).length;
                      const allLinked =
                        secCriteria.length > 0 && linkedInSec === secCriteria.length;

                      return (
                        <td
                          key={ex.id}
                          className="px-2 py-2 text-center border-r border-slate-200"
                        >
                          <button
                            type="button"
                            disabled={!canManageMatrix}
                            onClick={() =>
                              handleToggleSectionColumn(ex.id, section.id, secCriteria)
                            }
                            title={
                              canManageMatrix
                                ? `${allLinked ? 'Desmarcar' : 'Selecionar'} todos os critérios desta seção para ${ex.code}`
                                : 'Somente leitura'
                            }
                            className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums transition-colors ${
                              allLinked
                                ? 'bg-emerald-800 text-white font-semibold'
                                : 'bg-white text-slate-600 border border-slate-300 hover:border-emerald-600'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            {linkedInSec}/{secCriteria.length}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-mono tabular-nums text-xs text-slate-500">
                      —
                    </td>
                  </tr>

                  {/* Linhas de Critérios da Seção */}
                  {secCriteria.map((criterion) => {
                    const totalExLinked = criterionLinkCounts[criterion.id] || 0;

                    return (
                      <tr
                        key={criterion.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-3 border-r border-slate-200 align-top">
                          <div className="flex items-start gap-2.5">
                            <span className="font-mono tabular-nums text-xs font-semibold text-emerald-800 shrink-0 mt-0.5">
                              {criterion.code}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 leading-snug">
                                {criterion.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {criterion.description}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center font-mono tabular-nums text-xs font-semibold text-slate-700 border-r border-slate-200">
                          {criterion.weight}
                        </td>

                        {orderedExercises.map((ex) => {
                          const isLinked = linkLookupSet.has(
                            `${ex.id}::${criterion.id}`
                          );
                          return (
                            <td
                              key={ex.id}
                              className={`px-2 py-3 text-center border-r border-slate-200 transition-colors ${
                                isLinked ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              <button
                                type="button"
                                disabled={!canManageMatrix}
                                onClick={() => handleToggleCell(ex.id, criterion.id)}
                                aria-label={`Vínculo entre ${criterion.code} e ${ex.code}`}
                                className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-slate-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:cursor-not-allowed"
                              >
                                {isLinked ? (
                                  <CheckSquare className="w-5 h-5 text-emerald-700" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300" />
                                )}
                              </button>
                            </td>
                          );
                        })}

                        <td className="px-3 py-3 text-center font-mono tabular-nums text-xs font-semibold text-slate-700">
                          {totalExLinked}/{orderedExercises.length}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal “Vincular Critérios” com Isolamento Atômico por Exercise ID */}
      <CriteriaBindingModal
        isOpen={Boolean(modalExercise)}
        exercise={modalExercise}
        allCriteria={criteria}
        initialLinkedIds={
          modalExercise ? getCriteriaIdsForExercise(modalExercise.id) : []
        }
        onClose={() => setModalExercise(null)}
        onSaveLinks={async (exerciseId, nextIds) => {
          const res = await saveExerciseCriteriaLinks(exerciseId, nextIds);
          if (res.success) {
            setStatusBanner({ type: 'success', text: res.message });
          }
          return res;
        }}
      />

      {/* Modal de Cadastro de Novo Critério */}
      {showNewCriterionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <form
            onSubmit={handleCreateCriterionSubmit}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Adicionar Critério ao Checklist Mestre
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seção do Checklist
                </label>
                <select
                  value={newCritForm.sectionId}
                  onChange={(e) =>
                    setNewCritForm((prev) => ({ ...prev, sectionId: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código (ex: CR-4.4)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCritForm.code}
                    onChange={(e) =>
                      setNewCritForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="CR-4.4"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peso de Cálculo (1 a 5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={newCritForm.weight}
                    onChange={(e) =>
                      setNewCritForm((prev) => ({
                        ...prev,
                        weight: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Critério
                </label>
                <input
                  type="text"
                  required
                  value={newCritForm.name}
                  onChange={(e) =>
                    setNewCritForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Descreva o critério com clareza..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diretriz de Observação / Evidência
                </label>
                <textarea
                  rows={2}
                  value={newCritForm.description}
                  onChange={(e) =>
                    setNewCritForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Orientação técnica para o avaliador..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewCriterionModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg"
              >
                Salvar Critério
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
