import React, { useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Filter,
  Printer,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import { Exercise, Character, ExerciseDifficulty, CustomerTier } from '../../../types/portal';
import { CUSTOMER_TIER_BADGES } from '../../characters/views/CharactersManagementView';

export const DIFFICULTY_BADGES: Record<
  ExerciseDifficulty,
  { label: string; bg: string; text: string; border: string }
> = {
  Iniciante: {
    label: 'Iniciante',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  Mediano: {
    label: 'Mediano',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  Intermediário: {
    label: 'Intermediário',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
  },
};

export const ExercisesSimulationView: React.FC = () => {
  const {
    exercises,
    characters,
    hasPermission,
    saveExercise,
    deleteExercise,
  } = usePortalStore();

  const canManageExercises = hasPermission('can_manage_exercises');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [briefingModalExercise, setBriefingModalExercise] = useState<Exercise | null>(null);
  const [briefingActiveCharIndex, setBriefingActiveCharIndex] = useState(0);

  const [editorModalExercise, setEditorModalExercise] = useState<{
    open: boolean;
    exercise?: Exercise;
  }>({ open: false });

  const [deleteConfirmExercise, setDeleteConfirmExercise] = useState<Exercise | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal para visualização da guia do cliente
  const [viewGuideModal, setViewGuideModal] = useState<{
    clientName: string;
    guideUrl: string;
    guideName: string;
  } | null>(null);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return exercises.filter((ex) => {
      const difficulty = ex.difficulty || 'Mediano';
      if (selectedDifficultyFilter !== 'all' && difficulty !== selectedDifficultyFilter) return false;
      if (!q) return true;
      return (
        ex.title.toLowerCase().includes(q) ||
        ex.scenarioInstructions.toLowerCase().includes(q) ||
        difficulty.toLowerCase().includes(q)
      );
    });
  }, [exercises, searchQuery, selectedDifficultyFilter]);

  // Estados do formulário de criação/edição vinculando até 4 clientes
  const [formTitle, setFormTitle] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<ExerciseDifficulty>('Mediano');
  const [formInstructions, setFormInstructions] = useState('');
  const [formSelectedCharacterIds, setFormSelectedCharacterIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditor = (exercise?: Exercise) => {
    if (exercise) {
      setFormTitle(exercise.title);
      setFormDifficulty(exercise.difficulty || 'Mediano');
      setFormInstructions(exercise.scenarioInstructions);
      setFormSelectedCharacterIds(exercise.characterIds || []);
      setEditorModalExercise({ open: true, exercise });
    } else {
      setFormTitle('');
      setFormDifficulty('Mediano');
      setFormInstructions('');
      // Seleciona o primeiro cliente por padrão se houver
      setFormSelectedCharacterIds(characters.slice(0, 1).map((c) => c.id));
      setEditorModalExercise({ open: true });
    }
  };

  const handleToggleCharacter = (charId: string) => {
    setFormSelectedCharacterIds((prev) => {
      if (prev.includes(charId)) {
        return prev.filter((id) => id !== charId);
      }
      if (prev.length >= 4) {
        setFeedback({ type: 'error', text: 'Você pode selecionar até no máximo 4 clientes por exercício.' });
        return prev;
      }
      return [...prev, charId];
    });
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFeedback({ type: 'error', text: 'Informe o título do exercício.' });
      return;
    }
    if (formSelectedCharacterIds.length === 0) {
      setFeedback({ type: 'error', text: 'Vincule ao menos 1 cliente ao exercício (máximo 4).' });
      return;
    }

    setIsSubmitting(true);
    const res = await saveExercise({
      id: editorModalExercise.exercise?.id,
      title: formTitle.trim(),
      difficulty: formDifficulty,
      scenarioInstructions: formInstructions.trim(),
      characterIds: formSelectedCharacterIds.slice(0, 4),
    });
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: editorModalExercise.exercise
          ? 'Exercício atualizado com sucesso!'
          : 'Novo exercício criado com sucesso e pronto para uso!',
      });
      setEditorModalExercise({ open: false });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleDeleteExerciseConfirm = async () => {
    if (!deleteConfirmExercise) return;
    const res = await deleteExercise(deleteConfirmExercise.id);
    setDeleteConfirmExercise(null);

    if (res.success) {
      setFeedback({ type: 'success', text: 'Exercício removido com sucesso.' });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // Clientes do briefing ativo
  const briefingCharacters = useMemo(() => {
    if (!briefingModalExercise) return [];
    return briefingModalExercise.characterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter(Boolean) as Character[];
  }, [briefingModalExercise, characters]);

  const activeBriefingChar = briefingCharacters[briefingActiveCharIndex] || briefingCharacters[0];

  return (
    <div className="space-y-6">
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

      {/* Header Corporativo do Módulo */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Módulo 3 · Cenários de Roleplay</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Exercícios de Simulação
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Crie roteiros práticos de atendimento vinculando até 4 clientes do Banco de Clientes com suas respectivas carteirinhas, classificações e guias anexas.
          </p>
        </div>

        {canManageExercises && (
          <button
            type="button"
            onClick={() => openEditor()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Exercício</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros e Busca por Dificuldade */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por caso, instruções ou dificuldade..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-600">Dificuldade:</span>
          <select
            value={selectedDifficultyFilter}
            onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas as Dificuldades</option>
            <option value="Iniciante">Iniciante</option>
            <option value="Mediano">Mediano</option>
            <option value="Intermediário">Intermediário</option>
          </select>
          <div className="text-xs text-slate-500 font-medium ml-2">
            {filteredExercises.length} exercício(s)
          </div>
        </div>
      </div>

      {/* Grid de Cards de Exercícios */}
      {filteredExercises.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExercises.map((exercise) => {
            const diffBadge =
              DIFFICULTY_BADGES[exercise.difficulty || 'Mediano'] ||
              DIFFICULTY_BADGES['Mediano'];

            // Busca os clientes vinculados
            const linkedCharacters = exercise.characterIds
              .map((id) => characters.find((c) => c.id === id))
              .filter(Boolean) as Character[];

            return (
              <div
                key={exercise.id}
                className="bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group space-y-4"
              >
                <div className="space-y-3.5">
                  {/* Badge de Dificuldade & Título */}
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${diffBadge.bg} ${diffBadge.text} ${diffBadge.border}`}
                    >
                      Dificuldade: {diffBadge.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {linkedCharacters.length} cliente(s)
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-900 transition-colors leading-snug">
                    {exercise.title}
                  </h3>

                  {/* Cenário / Instruções */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Instruções do Caso:
                    </span>
                    <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                      {exercise.scenarioInstructions}
                    </p>
                  </div>

                  {/* Lista de Clientes Vinculados com Badge de Classificação e Carteirinha */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Clientes Vinculados ({linkedCharacters.length}/4):
                    </span>
                    <div className="space-y-1.5">
                      {linkedCharacters.map((char) => {
                        const tierBadge =
                          CUSTOMER_TIER_BADGES[char.customerTier || 'Mediano'] ||
                          CUSTOMER_TIER_BADGES['Mediano'];

                        return (
                          <div
                            key={char.id}
                            className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200/80 text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <div className="w-6 h-6 rounded-md bg-[#0f3e2e] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                {char.name.charAt(0)}
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-slate-900 truncate block text-[11px]">
                                  {char.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3 text-slate-400" />
                                  <span>{char.cardNumber || 'Sem carteirinha'}</span>
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}
                            >
                              {tierBadge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card com Ações */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBriefingActiveCharIndex(0);
                      setBriefingModalExercise(exercise);
                    }}
                    className="flex-1 py-2 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Roteiro</span>
                  </button>

                  {canManageExercises && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditor(exercise)}
                        className="p-2 text-slate-400 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar Exercício"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmExercise(exercise)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Exercício"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Nenhum exercício encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Cadastre um novo caso prático de atendimento e vincule clientes do Banco de Clientes.
          </p>
          {canManageExercises && (
            <button
              type="button"
              onClick={() => openEditor()}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-colors cursor-pointer"
            >
              Criar Primeiro Exercício
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: VISUALIZADOR DE BRIEFING DO EXERCÍCIO COM CLIENTES */}
      {/* ========================================================= */}
      {briefingModalExercise && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-[#0f3e2e] text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Roteiro do Atendimento · Dificuldade {briefingModalExercise.difficulty || 'Mediano'}
                </span>
                <h3 className="font-bold text-base text-white mt-0.5">
                  {briefingModalExercise.title}
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
                  onClick={() => setBriefingModalExercise(null)}
                  className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="printable-roteiro" className="p-6 overflow-y-auto space-y-6 flex-1 text-xs font-sans print:p-8">
              {/* Cabeçalho impresso oficial */}
              <div className="hidden print:block border-b-2 border-emerald-900 pb-3 mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Portal de Desempenho & Desenvolvimento Operacional
                </div>
                <h1 className="text-xl font-black text-slate-900 mt-0.5">
                  ROTEIRO DE ATENDIMENTO SIMULADO
                </h1>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                  <span><strong>Caso:</strong> {briefingModalExercise.title}</span>
                  <span>•</span>
                  <span><strong>Dificuldade:</strong> {briefingModalExercise.difficulty || 'Mediano'}</span>
                </div>
              </div>

              {/* Orientações Gerais do Caso */}
              <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-4.5 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Orientações do Caso de Simulação:
                </span>
                <p className="text-slate-800 leading-relaxed text-xs">
                  {briefingModalExercise.scenarioInstructions}
                </p>
              </div>

              {/* Abas dos Clientes Vinculados (Na tela interativa) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:hidden">
                  <span className="font-bold text-slate-900 text-sm">
                    Clientes Participantes ({briefingCharacters.length})
                  </span>
                  <div className="flex items-center gap-1.5">
                    {briefingCharacters.map((char, idx) => (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => setBriefingActiveCharIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                          briefingActiveCharIndex === idx
                            ? 'bg-[#0f3e2e] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {char.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {activeBriefingChar && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5 print:bg-white print:border-slate-300">
                    {/* Topo do Cliente */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">
                            {activeBriefingChar.name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              CUSTOMER_TIER_BADGES[activeBriefingChar.customerTier || 'Mediano']?.bg
                            } ${
                              CUSTOMER_TIER_BADGES[activeBriefingChar.customerTier || 'Mediano']?.text
                            } ${
                              CUSTOMER_TIER_BADGES[activeBriefingChar.customerTier || 'Mediano']?.border
                            }`}
                          >
                            {activeBriefingChar.customerTier || 'Mediano'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                          <span>{activeBriefingChar.age}</span>
                          <span>·</span>
                          <span>{activeBriefingChar.gender}</span>
                          <span>·</span>
                          <span>{activeBriefingChar.city}</span>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">
                          Carteirinha
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {activeBriefingChar.cardNumber}
                        </span>
                      </div>
                    </div>

                    {/* Contexto do Atendimento */}
                    <p className="text-slate-700 leading-relaxed text-xs">
                      <strong>Contexto:</strong> {activeBriefingChar.serviceContext || activeBriefingChar.history}
                    </p>

                    <p className="text-slate-700 leading-relaxed text-xs">
                      <strong>Humor:</strong> {activeBriefingChar.temperament}
                    </p>

                    <p className="text-slate-700 leading-relaxed text-xs">
                      <strong>Objetivo:</strong> {activeBriefingChar.objectives}
                    </p>

                    {/* Frases Típicas formatadas com aspas simples */}
                    {activeBriefingChar.typicalPhrases && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-slate-700 italic text-xs whitespace-pre-line">
                        {activeBriefingChar.typicalPhrases
                          .split('\n')
                          .map((l) => l.trim().replace(/^["'“”«»]+|["'“”«»,]+$/g, '').trim())
                          .filter(Boolean)
                          .map((l) => `"${l}"`)
                          .join('\n')}
                      </div>
                    )}

                    {/* Guia do Cliente Anexa */}
                    {activeBriefingChar.guideAttachmentUrl ? (
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-200 print:hidden">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-700" />
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">
                              {activeBriefingChar.guideAttachmentName || 'Guia de Atendimento'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Documento anexo do beneficiário
                            </span>
                          </div>
                        </div>

                        <a
                          href={activeBriefingChar.guideAttachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Guia do Cliente</span>
                        </a>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic print:hidden">
                        Este cliente não possui guia de atendimento anexada.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setBriefingModalExercise(null)}
                className="px-5 py-2 font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Fechar Roteiro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CRIADOR / EDITOR DE EXERCÍCIO */}
      {/* ========================================================= */}
      {editorModalExercise.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-[#0f3e2e] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base">
                  {editorModalExercise.exercise ? 'Editar Exercício' : '+ Novo Exercício de Simulação'}
                </h3>
                <p className="text-[11px] text-emerald-200">
                  Defina a dificuldade e vincule até 4 clientes do Banco de Clientes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorModalExercise({ open: false })}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExercise} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Título & Dificuldade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Título do Exercício / Caso *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Simulação de Atendimento SAC - Troca de Guia de Exame"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Dificuldade *
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as ExerciseDifficulty)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Intermediário">Intermediário</option>
                  </select>
                </div>
              </div>

              {/* Instruções do Caso */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Instruções e Roteiro Geral do Caso *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Orientações para o avaliador e atendente durante a condução deste exercício..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Seleção de Clientes (Até 4) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      Vincular Clientes do Banco ({formSelectedCharacterIds.length}/4) *
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Marque até 4 clientes que participarão deste caso prático.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {formSelectedCharacterIds.length} selecionado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {characters.map((char) => {
                    const isSelected = formSelectedCharacterIds.includes(char.id);
                    const tierBadge =
                      CUSTOMER_TIER_BADGES[char.customerTier || 'Mediano'] ||
                      CUSTOMER_TIER_BADGES['Mediano'];

                    return (
                      <div
                        key={char.id}
                        onClick={() => handleToggleCharacter(char.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate text-xs">
                              {char.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {char.cardNumber || 'Sem carteirinha'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}
                        >
                          {tierBadge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditorModalExercise({ open: false })}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : 'Salvar Exercício'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirmExercise && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Excluir &ldquo;{deleteConfirmExercise.title}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Este exercício será removido dos checklists e simulações sem quebrar os históricos já concluídos.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmExercise(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteExerciseConfirm}
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
