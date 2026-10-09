import React, { useMemo, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Plus,
  Edit3,
  Users,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import { Exercise } from '../../../types/portal';
import { CriteriaBindingModal } from '../../master-checklist/components/CriteriaBindingModal';

export const ExercisesCharactersView: React.FC = () => {
  const {
    exercises,
    characters,
    criteria,
    hasPermission,
    getCriteriaIdsForExercise,
    saveExerciseCriteriaLinks,
    saveExercise,
    generateSignedPdfDownload,
  } = usePortalStore();

  const canManageExercises = hasPermission('exercises:manage');
  const canManageMatrix = hasPermission('master_checklist:manage');
  const canDownloadPdf = hasPermission('materials:download');

  const [activeTab, setActiveTab] = useState<'exercises' | 'characters'>('exercises');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharacterFilter, setSelectedCharacterFilter] = useState<string>('all');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exercises[0]?.id || 'ex-01'
  );

  // Modal de edição/criação de exercício (operações distintas por ID)
  const [editorModalState, setEditorModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    exercise?: Exercise;
  }>({ open: false, mode: 'create' });

  // Modal de vínculo de critérios unificado com o Checklist Mestre
  const [criteriaModalExercise, setCriteriaModalExercise] = useState<Exercise | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...exercises]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .filter((ex) => {
        if (
          selectedCharacterFilter !== 'all' &&
          !ex.characterIds.includes(selectedCharacterFilter)
        ) {
          return false;
        }
        if (!q) return true;
        return (
          ex.code.toLowerCase().includes(q) ||
          ex.title.toLowerCase().includes(q) ||
          ex.objective.toLowerCase().includes(q) ||
          ex.scenarioDescription.toLowerCase().includes(q)
        );
      });
  }, [exercises, searchQuery, selectedCharacterFilter]);

  const activeExercise = useMemo(
    () =>
      exercises.find((e) => e.id === selectedExerciseId) ||
      filteredExercises[0] ||
      null,
    [exercises, selectedExerciseId, filteredExercises]
  );

  const linkedCharactersForActive = useMemo(() => {
    if (!activeExercise) return [];
    return characters.filter((ch) => activeExercise.characterIds.includes(ch.id));
  }, [activeExercise, characters]);

  const linkedCriteriaForActive = useMemo(() => {
    if (!activeExercise) return [];
    const ids = getCriteriaIdsForExercise(activeExercise.id);
    return criteria.filter((c) => ids.includes(c.id));
  }, [activeExercise, criteria, getCriteriaIdsForExercise]);

  const handleDownloadAttachment = async (exerciseId: string, attachmentId: string) => {
    const res = await generateSignedPdfDownload(exerciseId, attachmentId);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });

    if (res.success && res.blobUrl && res.fileName) {
      const a = document.createElement('a');
      a.href = res.blobUrl;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(res.blobUrl!), 5000);
    }
  };

  const handlePrintExercise = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5 no-print">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Desenvolvimento de Colaboradores · Relacionamento N:M
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Personagens, Exercícios e Anexos Oficiais
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Consulte roteiros de simulação, múltiplos personagens associados a cada exercício,
            critérios vinculados e baixe guias em PDF com controle de autorização.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('exercises')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'exercises'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catálogo de Exercícios ({exercises.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('characters')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'characters'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personagens ({characters.length})
            </button>
          </div>

          {canManageExercises && (
            <button
              type="button"
              onClick={() =>
                setEditorModalState({ open: true, mode: 'create' })
              }
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Exercício</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback de Download ou Salvamento */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 text-sm no-print ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
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

      {activeTab === 'exercises' ? (
        <div className="space-y-6">
          {/* Barra de Pesquisa e Filtro por Personagem */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar exercício por código, título ou cenário..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Filtrar por Personagem:
              </label>
              <select
                value={selectedCharacterFilter}
                onChange={(e) => setSelectedCharacterFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800"
              >
                <option value="all">Todos os Personagens ({characters.length})</option>
                {characters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.code} — {ch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Layout Mestre-Detalhe dos Exercícios */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna Esquerda: Lista de Exercícios */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden no-print">
              <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Exercícios Encontrados</span>
                <span className="font-mono tabular-nums">{filteredExercises.length}</span>
              </div>

              {filteredExercises.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Nenhum exercício corresponde aos filtros aplicados.
                </div>
              ) : (
                filteredExercises.map((ex) => {
                  const isSelected = activeExercise?.id === ex.id;
                  const critCount = getCriteriaIdsForExercise(ex.id).length;

                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setSelectedExerciseId(ex.id)}
                      className={`w-full text-left px-4 py-3.5 transition-colors flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-emerald-50/70 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-500">
                        <span className="font-bold text-emerald-800">{ex.code}</span>
                        <span>
                          {ex.characterIds.length} personagem(ns) · {critCount} critério(s) · {ex.estimatedMinutes} min
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 leading-snug">
                        {ex.title}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2">
                        {ex.objective}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Coluna Direita: Ficha Completa do Exercício (Suporta Impressão Direta) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              {!activeExercise ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Selecione um exercício na lista ao lado para visualizar seus detalhes.
                </div>
              ) : (
                <>
                  {/* Cabeçalho do Exercício Selecionado */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <div className="text-xs font-mono tabular-nums text-emerald-800 font-semibold">
                        {activeExercise.code} · Duração estimada: {activeExercise.estimatedMinutes} minutos · Ordem #{activeExercise.orderIndex}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 mt-1">
                        {activeExercise.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 no-print shrink-0">
                      <button
                        type="button"
                        onClick={handlePrintExercise}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir Ficha</span>
                      </button>

                      {canManageMatrix && (
                        <button
                          type="button"
                          onClick={() => setCriteriaModalExercise(activeExercise)}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Vincular Critérios ({linkedCriteriaForActive.length})</span>
                        </button>
                      )}

                      {canManageExercises && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditorModalState({
                              open: true,
                              mode: 'edit',
                              exercise: activeExercise,
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Exercício</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Objetivo e Cenário */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                      <h3 className="text-xs font-semibold text-slate-500">
                        Objetivo Pedagógico e Operacional
                      </h3>
                      <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                        {activeExercise.objective}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                      <h3 className="text-xs font-semibold text-slate-500">
                        Cenário da Simulação
                      </h3>
                      <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                        {activeExercise.scenarioDescription}
                      </p>
                    </div>
                  </div>

                  {/* Personagens Vinculados ao Exercício (Relação N:M real) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-700" />
                        <span>
                          Personagens Vinculados a este Exercício ({linkedCharactersForActive.length})
                        </span>
                      </h3>
                      <span className="text-xs text-slate-500">
                        Relação N:M independente por exercício
                      </span>
                    </div>

                    {linkedCharactersForActive.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                        Nenhum personagem vinculado a este exercício no momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {linkedCharactersForActive.map((char) => (
                          <div
                            key={char.id}
                            className="p-3.5 border border-slate-200 rounded-lg bg-white space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                              <span className="font-bold text-emerald-800">{char.code}</span>
                              <span>Complexidade: {char.difficultyLevel}</span>
                            </div>
                            <div className="text-sm font-bold text-slate-900">
                              {char.name}
                            </div>
                            <div className="text-xs font-medium text-slate-600">
                              {char.archetype}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {char.profileSummary}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PDFs e Anexos Armazenados no Supabase Storage */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-700" />
                        <span>
                          PDFs e Anexos Técnicos ({activeExercise.attachments.length})
                        </span>
                      </h3>
                      <span className="text-xs text-slate-500">
                        Bucket seguro: portal-materials
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeExercise.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-4 border border-slate-200 rounded-lg bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500 font-mono tabular-nums">
                              {att.documentType} · {att.fileName} · {att.fileSizeKb} KB
                            </div>
                            <div className="text-sm font-semibold text-slate-900">
                              {att.title}
                            </div>
                            <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5 pt-1">
                              {att.contentSummary.map((line, idx) => (
                                <li key={idx}>{line}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="shrink-0 no-print">
                            <button
                              type="button"
                              disabled={!canDownloadPdf}
                              onClick={() =>
                                handleDownloadAttachment(activeExercise.id, att.id)
                              }
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Baixar Documento</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Critérios do Checklist Mestre Vinculados ao Exercício */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-700" />
                        <span>
                          Critérios do Checklist Mestre Aplicáveis ({linkedCriteriaForActive.length})
                        </span>
                      </h3>
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        Sincronizado com a Matriz
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                      {linkedCriteriaForActive.map((crit) => (
                        <div key={crit.id} className="px-3.5 py-2.5 flex items-start justify-between gap-4 text-xs">
                          <div>
                            <span className="font-mono font-bold text-emerald-800 mr-2">
                              {crit.code}
                            </span>
                            <span className="font-medium text-slate-900">
                              {crit.name}
                            </span>
                            <div className="text-slate-500 mt-0.5">{crit.sectionName}</div>
                          </div>
                          <span className="font-mono tabular-nums text-slate-600 shrink-0">
                            Peso {crit.weight}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Aba de Catálogo Completo de Personagens */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {characters.map((char) => {
            const linkedExs = exercises.filter((ex) =>
              ex.characterIds.includes(char.id)
            );
            return (
              <div
                key={char.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500">
                    <span className="font-bold text-emerald-800">{char.code}</span>
                    <span>Nível {char.difficultyLevel}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{char.name}</h3>
                  <div className="text-xs font-semibold text-slate-700">
                    {char.archetype}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {char.profileSummary}
                  </p>

                  <div className="pt-2 space-y-1">
                    <div className="text-xs font-semibold text-slate-700">
                      Principais Objeções em Simulação:
                    </div>
                    <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                      {char.keyObjections.map((obj, idx) => (
                        <li key={idx}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>Exercícios vinculados:</span>
                  <span className="font-bold text-slate-800">
                    {linkedExs.map((e) => e.code).join(', ') || 'Nenhum'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal “Vincular Critérios” compartilhado com o Checklist Mestre */}
      <CriteriaBindingModal
        isOpen={Boolean(criteriaModalExercise)}
        exercise={criteriaModalExercise}
        allCriteria={criteria}
        initialLinkedIds={
          criteriaModalExercise
            ? getCriteriaIdsForExercise(criteriaModalExercise.id)
            : []
        }
        onClose={() => setCriteriaModalExercise(null)}
        onSaveLinks={async (exerciseId, nextIds) => {
          const res = await saveExerciseCriteriaLinks(exerciseId, nextIds);
          setFeedback({
            type: res.success ? 'success' : 'error',
            text: res.message,
          });
          return res;
        }}
      />

      {/* Modal de Criação / Edição de Exercício e Associação N:M de Personagens */}
      {editorModalState.open && (
        <ExerciseFormModal
          key={editorModalState.exercise?.id || 'new-exercise'}
          mode={editorModalState.mode}
          initialExercise={editorModalState.exercise}
          allCharacters={characters}
          defaultOrderIndex={exercises.length + 1}
          onClose={() => setEditorModalState({ open: false, mode: 'create' })}
          onSubmit={async (formPayload) => {
            const res = await saveExercise(formPayload);
            setFeedback({
              type: res.success ? 'success' : 'error',
              text: res.message,
            });
            if (res.success) {
              setEditorModalState({ open: false, mode: 'create' });
            }
          }}
        />
      )}
    </div>
  );
};

interface ExerciseFormModalProps {
  mode: 'create' | 'edit';
  initialExercise?: Exercise;
  allCharacters: Array<{ id: string; code: string; name: string; difficultyLevel: string }>;
  defaultOrderIndex: number;
  onClose: () => void;
  onSubmit: (payload: {
    id?: string;
    code: string;
    orderIndex: number;
    title: string;
    objective: string;
    scenarioDescription: string;
    estimatedMinutes: number;
    isActive: boolean;
    characterIds: string[];
  }) => Promise<void>;
}

const ExerciseFormModal: React.FC<ExerciseFormModalProps> = ({
  mode,
  initialExercise,
  allCharacters,
  defaultOrderIndex,
  onClose,
  onSubmit,
}) => {
  const [code, setCode] = useState(
    initialExercise?.code || `EX-${String(defaultOrderIndex).padStart(2, '0')}`
  );
  const [orderIndex, setOrderIndex] = useState(
    initialExercise?.orderIndex || defaultOrderIndex
  );
  const [title, setTitle] = useState(initialExercise?.title || '');
  const [objective, setObjective] = useState(initialExercise?.objective || '');
  const [scenarioDescription, setScenarioDescription] = useState(
    initialExercise?.scenarioDescription || ''
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    initialExercise?.estimatedMinutes || 20
  );
  const [selectedCharIds, setSelectedCharIds] = useState<Set<string>>(
    () => new Set(initialExercise?.characterIds || [])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCharacter = (charId: string) => {
    setSelectedCharIds((prev) => {
      const next = new Set(prev);
      if (next.has(charId)) {
        next.delete(charId);
      } else {
        next.add(charId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        id: mode === 'edit' ? initialExercise?.id : undefined,
        code,
        orderIndex,
        title,
        objective,
        scenarioDescription,
        estimatedMinutes,
        isActive: true,
        characterIds: Array.from(selectedCharIds),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-xl"
      >
        <div className="border-b border-slate-200 pb-3">
          <div className="text-xs font-semibold text-emerald-800">
            {mode === 'create'
              ? 'Operação de Criação de Novo Exercício'
              : `Operação de Edição Isolada · ID ${initialExercise?.id}`}
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? 'Cadastrar Exercício' : `Editar ${initialExercise?.code}`}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Código
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ordem na Matriz
            </label>
            <input
              type="number"
              min={1}
              max={30}
              required
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Duração (minutos)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              required
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Título Completo do Exercício
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Exercício 11 — Tratativa de Contestação..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Objetivo Pedagógico
          </label>
          <textarea
            rows={2}
            required
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Descrição do Cenário
          </label>
          <textarea
            rows={2}
            required
            value={scenarioDescription}
            onChange={(e) => setScenarioDescription(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Associação N:M de Personagens */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Personagens Associados (Suporta Múltiplos Personagens — N:M)
            </label>
            <span className="text-xs font-mono tabular-nums text-emerald-800 font-semibold">
              {selectedCharIds.size} selecionado(s)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
            {allCharacters.map((ch) => {
              const checked = selectedCharIds.has(ch.id);
              return (
                <label
                  key={ch.id}
                  className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer text-xs transition-colors ${
                    checked
                      ? 'bg-emerald-50 border-emerald-400 text-slate-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCharacter(ch.id)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-700"
                  />
                  <div>
                    <div className="font-mono font-bold text-emerald-800">{ch.code}</div>
                    <div>{ch.name}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg disabled:opacity-50"
          >
            {isSubmitting
              ? 'Salvando...'
              : mode === 'create'
              ? 'Criar Exercício'
              : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};
