import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckSquare,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Filter,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import { Checklist } from '../../../types/portal';

export const ChecklistsManagementView: React.FC = () => {
  const {
    checklists,
    exercises,
    categories,
    hasPermission,
    saveChecklist,
    deleteChecklist,
    createCategory,
  } = usePortalStore();

  const canManageChecklists = hasPermission('can_manage_checklists');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [modalState, setModalState] = useState<{
    open: boolean;
    checklist?: Checklist;
  }>({ open: false });

  // Modal rápido de + Nova Categoria
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Modal de Confirmação de Exclusão do Checklist
  const [deleteConfirmChecklist, setDeleteConfirmChecklist] = useState<Checklist | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const checklistCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'checklist' || c.type === 'geral');
  }, [categories]);

  const filteredChecklists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return checklists.filter((chk) => {
      const categoryName = chk.categoryName || 'Geral';
      if (selectedCategoryFilter !== 'all' && categoryName !== selectedCategoryFilter) return false;
      if (!q) return true;
      return (
        chk.title.toLowerCase().includes(q) ||
        chk.description.toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q)
      );
    });
  }, [checklists, searchQuery, selectedCategoryFilter]);

  // Estados do Modal Criador Visual de Checklists
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formCategoryName, setFormCategoryName] = useState(checklistCategories[0]?.name || 'Atendimento SAC');
  const [formHasExercises, setFormHasExercises] = useState(false);

  // Critérios diretos do checklist
  const [activeCriteriaItems, setActiveCriteriaItems] = useState<
    Array<{ id?: string; name: string; weight: number }>
  >([]);

  // Campo de adicionar critério na hora
  const [quickCriterionName, setQuickCriterionName] = useState('');
  const [quickCriterionWeight, setQuickCriterionWeight] = useState(1);

  // Exercícios vinculados por checkbox
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreator = (chk?: Checklist) => {
    if (chk) {
      setFormTitle(chk.title);
      setFormDescription(chk.description || '');
      setFormCategoryId(chk.categoryId || '');
      setFormCategoryName(chk.categoryName || checklistCategories[0]?.name || 'Atendimento SAC');
      setFormHasExercises(chk.hasExercises);
      setActiveCriteriaItems(
        chk.criteria.map((c) => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
        }))
      );
      setSelectedExerciseIds(chk.exerciseIds || []);
      setModalState({ open: true, checklist: chk });
    } else {
      setFormTitle('');
      setFormDescription('');
      setFormCategoryId(checklistCategories[0]?.id || '');
      setFormCategoryName(checklistCategories[0]?.name || 'Atendimento SAC');
      setFormHasExercises(false);
      setActiveCriteriaItems([
        { id: `crit-${Date.now()}-1`, name: 'Abertura profissional com saudação cordial e identificação', weight: 2 },
        { id: `crit-${Date.now()}-2`, name: 'Escuta ativa e confirmação das necessidades do cliente', weight: 2 },
        { id: `crit-${Date.now()}-3`, name: 'Consulta correta aos sistemas e normas de atendimento', weight: 3 },
        { id: `crit-${Date.now()}-4`, name: 'Clareza na explicação da solução e resolução assertiva', weight: 3 },
      ]);
      setSelectedExerciseIds([]);
      setModalState({ open: true });
    }
  };

  const handleAddQuickCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCriterionName.trim()) return;

    const newItem = {
      id: `crit-custom-${Date.now()}`,
      name: quickCriterionName.trim(),
      weight: Number(quickCriterionWeight) || 1,
    };

    setActiveCriteriaItems((prev) => [...prev, newItem]);
    setQuickCriterionName('');
    setQuickCriterionWeight(1);
  };

  const handleRemoveCriterion = (indexToRemove: number) => {
    setActiveCriteriaItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateCriterionWeight = (index: number, newWeight: number) => {
    setActiveCriteriaItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, weight: Math.max(1, newWeight) } : item))
    );
  };

  const handleToggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const res = await createCategory({
      name: newCategoryName.trim(),
      type: 'checklist',
    });

    if (res.success && res.category) {
      setFormCategoryId(res.category.id);
      setFormCategoryName(res.category.name);
      setFeedback({ type: 'success', text: `Categoria "${res.category.name}" criada com sucesso!` });
      setShowNewCategoryModal(false);
      setNewCategoryName('');
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFeedback({ type: 'error', text: 'Informe o título do checklist.' });
      return;
    }
    if (activeCriteriaItems.length === 0) {
      setFeedback({ type: 'error', text: 'Adicione ao menos um critério de avaliação.' });
      return;
    }

    setIsSubmitting(true);
    const res = await saveChecklist({
      id: modalState.checklist?.id,
      title: formTitle.trim(),
      description: formDescription.trim(),
      categoryId: formCategoryId || undefined,
      categoryName: formCategoryName,
      hasExercises: formHasExercises && selectedExerciseIds.length > 0,
      exerciseIds: formHasExercises ? selectedExerciseIds : [],
      criteria: activeCriteriaItems,
    });
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: modalState.checklist
          ? 'Checklist atualizado com sucesso!'
          : 'Checklist completo salvo e disponível para colaboradores!',
      });
      setModalState({ open: false });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleDeleteClick = (chk: Checklist) => {
    setDeleteConfirmChecklist(chk);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmChecklist) return;
    const res = await deleteChecklist(deleteConfirmChecklist.id);
    setDeleteConfirmChecklist(null);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

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
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Módulo 2 · Avaliação Flexível</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Checklists de Avaliação
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Crie e gerencie modelos de verificação com critérios ponderados. Checklists podem ser puramente teóricos/operacionais ou conter exercícios simulados integrados.
          </p>
        </div>

        {canManageChecklists && (
          <button
            type="button"
            onClick={() => openCreator()}
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Checklist</span>
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
            placeholder="Buscar por título ou descrição..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Categoria:</span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas as Categorias</option>
            {checklistCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de Checklists Cadastrados */}
      {filteredChecklists.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Nenhum checklist encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Crie o primeiro checklist definindo os critérios de excelência e vinculando exercícios se desejar.
          </p>
          {canManageChecklists && (
            <button
              type="button"
              onClick={() => openCreator()}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-colors cursor-pointer"
            >
              Criar Primeiro Checklist
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredChecklists.map((chk) => (
            <div
              key={chk.id}
              className="bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {chk.categoryName || 'Atendimento SAC'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                      {chk.title}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      chk.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {chk.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {chk.description || 'Modelo de avaliação operacional de atendimento.'}
                </p>

                {/* Métricas do Checklist */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <div className="text-[11px] text-slate-500 font-medium">Critérios</div>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      {chk.criteria.length} itens
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <div className="text-[11px] text-slate-500 font-medium">Exercícios</div>
                    <div className="text-sm font-bold text-emerald-800 font-mono">
                      {chk.hasExercises ? `${chk.exerciseIds.length} caso(s)` : 'Sem exercícios'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              {canManageChecklists && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openCreator(chk)}
                    className="flex-1 py-2 px-3 text-xs font-bold text-[#0f3e2e] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Modelo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteClick(chk)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir checklist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CRIADOR / EDITOR VISUAL DE CHECKLIST */}
      {/* ========================================================= */}
      {modalState.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4.5 bg-[#0f3e2e] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">
                    {modalState.checklist ? 'Editar Checklist' : 'Novo Checklist de Avaliação'}
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Defina critérios ponderados e vincule exercícios práticos opcionais
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalState({ open: false })}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveChecklist} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* BLOCO 1: Informações Gerais */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1. Dados Básicos do Checklist</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Título do Checklist *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Checklist de Atendimento SAC e Resolução de Reclamações"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">
                        Categoria Padronizada *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewCategoryModal(true)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        + Nova Categoria
                      </button>
                    </div>
                    <select
                      value={formCategoryName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormCategoryName(val);
                        const matched = checklistCategories.find((c) => c.name === val);
                        if (matched) setFormCategoryId(matched.id);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                    >
                      {checklistCategories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Possui Exercícios de Simulação?
                    </label>
                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                        <input
                          type="checkbox"
                          checked={formHasExercises}
                          onChange={(e) => setFormHasExercises(e.target.checked)}
                          className="rounded text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                        />
                        <span>Sim, vincular casos/exercícios práticos</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Instruções / Descrição
                    </label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Orientações aos avaliadores sobre como aplicar esta avaliação..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: Critérios de Avaliação (Checklist Real) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>2. Critérios de Avaliação ({activeCriteriaItems.length} itens)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Itens que serão checados na simulação
                  </span>
                </div>

                {/* Adicionar critério na hora */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">
                    + Adicionar Critério Rápido
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={quickCriterionName}
                      onChange={(e) => setQuickCriterionName(e.target.value)}
                      placeholder="Nome do critério (ex: Clareza na explicação do cálculo)"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                        Peso:
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={quickCriterionWeight}
                        onChange={(e) => setQuickCriterionWeight(Number(e.target.value) || 1)}
                        className="w-14 px-2 py-1.5 text-center font-bold border border-slate-200 rounded-lg bg-slate-50 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddQuickCriterion}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors"
                      >
                        Inserir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Critérios Ativos */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeCriteriaItems.length === 0 ? (
                    <div className="p-4 bg-white border border-dashed border-slate-200 rounded-lg text-center text-slate-500">
                      Nenhum critério adicionado ainda. Adicione pelo menos um no campo acima.
                    </div>
                  ) : (
                    activeCriteriaItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-slate-800 text-xs truncate">
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="flex items-center gap-1 text-[11px] text-slate-500">
                            <span>Peso:</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={item.weight}
                              onChange={(e) =>
                                handleUpdateCriterionWeight(idx, Number(e.target.value) || 1)
                              }
                              className="w-10 px-1 py-0.5 text-center font-mono font-bold text-slate-900 border border-slate-200 rounded bg-slate-50"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Remover critério"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* BLOCO 3: Exercícios Vinculados (Opcional se formHasExercises for verdadeiro) */}
              {formHasExercises && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      3. Exercícios Vinculados ({selectedExerciseIds.length} selecionados)
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Marque os casos práticos a serem simulados
                    </span>
                  </div>

                  {exercises.length === 0 ? (
                    <div className="p-4 bg-white border border-dashed border-slate-200 rounded-lg text-center text-slate-500">
                      Nenhum exercício cadastrado no sistema ainda. Crie exercícios na aba "Exercícios & Clientes".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                      {exercises.map((ex) => {
                        const isChecked = selectedExerciseIds.includes(ex.id);
                        return (
                          <label
                            key={ex.id}
                            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleExercise(ex.id)}
                              className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate">
                                {ex.title}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {ex.categoryName || 'Exercício'} · {ex.characterIds.length} cliente(s)
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Rodapé e Ações do Formulário */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalState({ open: false })}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : 'Salvar Checklist'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: + NOVA CATEGORIA RÁPIDA */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#0f3e2e] text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Nova Categoria de Checklist</h4>
              <button
                type="button"
                onClick={() => setShowNewCategoryModal(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategorySubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Cobrança e Negociação"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Criar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CHECKLIST */}
      {deleteConfirmChecklist && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Tem certeza que deseja excluir o checklist &ldquo;{deleteConfirmChecklist.title}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Os colaboradores vinculados a ele serão desvinculados automaticamente (exclusão em cascata).
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmChecklist(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
