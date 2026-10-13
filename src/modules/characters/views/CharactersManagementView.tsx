import React, { useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Sparkles,
  UserCheck,
  FileText,
  Upload,
  ExternalLink,
  CreditCard,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import { Character, Gender, CustomerTier } from '../../../types/portal';

export const CUSTOMER_TIER_BADGES: Record<
  CustomerTier,
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

export const CharactersManagementView: React.FC = () => {
  const {
    characters,
    hasPermission,
    saveCharacter,
    deleteCharacter,
    uploadClientGuide,
  } = usePortalStore();

  const canManage = hasPermission('can_manage_exercises');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [modalState, setModalState] = useState<{
    open: boolean;
    character?: Character;
  }>({ open: false });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<Character | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal para visualização rápida da Guia do Cliente
  const [viewGuideModal, setViewGuideModal] = useState<{
    open: boolean;
    clientName: string;
    guideUrl: string;
    guideName: string;
  } | null>(null);

  // Formulário com os novos campos obrigatórios
  const [formData, setFormData] = useState<{
    name: string;
    age: string;
    gender: Gender;
    city: string;
    cardNumber: string;
    customerTier: CustomerTier;
    serviceContext: string;
    temperament: string;
    objectives: string;
    typicalPhrases: string;
    guideAttachmentUrl: string;
    guideAttachmentName: string;
  }>({
    name: '',
    age: '',
    gender: 'Masculino',
    city: '',
    cardNumber: '',
    customerTier: 'Mediano',
    serviceContext: '',
    temperament: '',
    objectives: '',
    typicalPhrases: '',
    guideAttachmentUrl: '',
    guideAttachmentName: '',
  });

  const [isUploadingGuide, setIsUploadingGuide] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCharacters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return characters.filter((c) => {
      if (selectedTierFilter !== 'all' && c.customerTier !== selectedTierFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.cardNumber.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.temperament.toLowerCase().includes(q) ||
        c.typicalPhrases.toLowerCase().includes(q) ||
        c.serviceContext.toLowerCase().includes(q)
      );
    });
  }, [characters, searchQuery, selectedTierFilter]);

  const openModal = (character?: Character) => {
    if (character) {
      setFormData({
        name: character.name,
        age: character.age || '45 anos',
        gender: character.gender || 'Masculino',
        city: character.city || 'São Paulo - SP',
        cardNumber: character.cardNumber || '',
        customerTier: character.customerTier || 'Mediano',
        serviceContext: character.serviceContext || character.history || '',
        temperament: character.temperament || '',
        objectives: character.objectives || '',
        typicalPhrases: character.typicalPhrases || '',
        guideAttachmentUrl: character.guideAttachmentUrl || '',
        guideAttachmentName: character.guideAttachmentName || '',
      });
      setModalState({ open: true, character });
    } else {
      setFormData({
        name: '',
        age: '',
        gender: 'Masculino',
        city: '',
        cardNumber: '',
        customerTier: 'Mediano',
        serviceContext: '',
        temperament: '',
        objectives: '',
        typicalPhrases: '',
        guideAttachmentUrl: '',
        guideAttachmentName: '',
      });
      setModalState({ open: true });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGuide(true);
    const res = await uploadClientGuide(file);
    setIsUploadingGuide(false);

    if (res.success && res.url) {
      setFormData((prev) => ({
        ...prev,
        guideAttachmentUrl: res.url || '',
        guideAttachmentName: res.fileName || file.name,
      }));
      setFeedback({ type: 'success', text: 'Guia do cliente carregada com sucesso!' });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', text: 'Informe o nome completo do cliente.' });
      return;
    }
    if (!formData.cardNumber.trim()) {
      setFeedback({ type: 'error', text: 'Informe o número da carteirinha do convênio.' });
      return;
    }
    if (!formData.serviceContext.trim()) {
      setFeedback({ type: 'error', text: 'Informe o contexto do atendimento da simulação.' });
      return;
    }

    setIsSubmitting(true);
    const res = await saveCharacter({
      id: modalState.character?.id,
      name: formData.name.trim(),
      age: formData.age.trim() || 'Não informada',
      gender: formData.gender,
      city: formData.city.trim() || 'São Paulo - SP',
      cardNumber: formData.cardNumber.trim(),
      customerTier: formData.customerTier,
      serviceContext: formData.serviceContext.trim(),
      temperament: formData.temperament.trim() || 'Neutro, aguarda orientações',
      objectives: formData.objectives.trim() || 'Obter atendimento resolutivo para sua solicitação',
      typicalPhrases: formData.typicalPhrases.trim() || '"Gostaria de resolver minha guia."',
      guideAttachmentUrl: formData.guideAttachmentUrl || null,
      guideAttachmentName: formData.guideAttachmentName || null,
    });
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: modalState.character
          ? 'Perfil do cliente atualizado com sucesso!'
          : 'Novo cliente cadastrado no Banco de Clientes!',
      });
      setModalState({ open: false });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal) return;
    const res = await deleteCharacter(deleteConfirmModal.id);
    setDeleteConfirmModal(null);

    if (res.success) {
      setFeedback({ type: 'success', text: 'Cliente removido com sucesso.' });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
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

      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Banco de Clientes & Atuação Fictícia</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Banco de Clientes / Personagens
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Perfis de beneficiários com carteirinha, contexto clínico/operacional, classificação de complexidade e guias anexas interpretados durante as simulações.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => openModal()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Cliente</span>
          </button>
        )}
      </div>

      {/* Busca e Filtro por Classificação */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, carteirinha, cidade ou contexto..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-600">Classificação:</span>
          <select
            value={selectedTierFilter}
            onChange={(e) => setSelectedTierFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas as Classificações</option>
            <option value="Iniciante">Iniciante</option>
            <option value="Mediano">Mediano</option>
            <option value="Intermediário">Intermediário</option>
          </select>
          <div className="text-xs text-slate-500 font-medium ml-2">
            {filteredCharacters.length} cliente(s)
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredCharacters.length === 0 && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Nenhum cliente cadastrado no banco
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cadastre beneficiários com carteirinha, contexto de atendimento e guias anexas para as simulações práticas.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => openModal()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
          )}
        </div>
      )}

      {/* Grid de Cards dos Clientes */}
      {filteredCharacters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCharacters.map((char) => {
            const tierBadge =
              CUSTOMER_TIER_BADGES[char.customerTier || 'Mediano'] ||
              CUSTOMER_TIER_BADGES['Mediano'];

            return (
              <div
                key={char.id}
                className="bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group space-y-4"
              >
                <div className="space-y-3.5">
                  {/* Topo do Card com Badge de Classificação */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#0f3e2e] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                        {char.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                          {char.name}
                        </h3>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{char.age || 'Idade N/I'}</span>
                          <span>·</span>
                          <span>{char.gender || 'Masculino'}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}
                    >
                      {tierBadge.label}
                    </span>
                  </div>

                  {/* Informações de Convênio: Carteirinha e Cidade */}
                  <div className="grid grid-cols-1 gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Carteirinha:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {char.cardNumber || 'Sem carteirinha'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Cidade:</span>
                      </span>
                      <span className="font-medium text-slate-700">
                        {char.city || 'São Paulo - SP'}
                      </span>
                    </div>
                  </div>

                  {/* Contexto do Atendimento */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Contexto do Atendimento:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/70 line-clamp-3">
                      {char.serviceContext || char.history || 'Sem contexto informado.'}
                    </p>
                  </div>

                  {/* Humor e Objetivo */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Humor:
                      </span>
                      <p className="text-slate-700 italic">
                        &ldquo;{char.temperament.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim()}&rdquo;
                      </p>
                    </div>
                    {char.objectives && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Objetivo:
                        </span>
                        <p className="text-slate-700">
                          {char.objectives}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card: Guia Anexa e Ações */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {/* Botão de Guia Anexa */}
                  {char.guideAttachmentUrl ? (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="truncate text-slate-700 font-medium text-[11px]">
                          {char.guideAttachmentName || 'Guia de Atendimento'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setViewGuideModal({
                            open: true,
                            clientName: char.name,
                            guideUrl: char.guideAttachmentUrl!,
                            guideName: char.guideAttachmentName || 'Guia de Atendimento',
                          })
                        }
                        className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir Guia</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic px-1">
                      Nenhuma guia de atendimento anexada.
                    </div>
                  )}

                  {/* Botões de Ação do Card */}
                  {canManage && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openModal(char)}
                        className="flex-1 py-2 px-3 text-xs font-bold text-[#0f3e2e] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Cliente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmModal(char)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir cliente do banco"
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
      )}

      {/* ======================================================== */}
      {/* MODAL DE CRIAÇÃO / EDIÇÃO (+ NOVO CLIENTE) */}
      {/* ======================================================== */}
      {modalState.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-[#0f3e2e] text-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-white">
                  {modalState.character ? 'Editar Perfil do Cliente' : '+ Novo Cliente Simulado'}
                </h2>
                <p className="text-xs text-emerald-200">
                  Cadastre dados completos de convênio de saúde e anexos de guia para a simulação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalState({ open: false })}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Linha 1: Nome Completo & Carteirinha */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Sr. Milton Ribeiro"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº da Carteirinha *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    placeholder="Ex: 0023.9841.00192-00"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Linha 2: Idade, Sexo, Cidade & Classificação */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Idade
                  </label>
                  <input
                    type="text"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Ex: 45 anos"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sexo *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as Gender })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ex: São Paulo - SP"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Classificação *
                  </label>
                  <select
                    value={formData.customerTier}
                    onChange={(e) =>
                      setFormData({ ...formData, customerTier: e.target.value as CustomerTier })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Intermediário">Intermediário</option>
                  </select>
                </div>
              </div>

              {/* Linha 3: Contexto do Atendimento (Único) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contexto do Atendimento (Situação & Problema do Cliente) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.serviceContext}
                  onChange={(e) => setFormData({ ...formData, serviceContext: e.target.value })}
                  placeholder="Explique o caso: Ex: Teve sua guia de exame cancelada indevidamente no sistema e está com consulta marcada para hoje..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Linha 4: Humor & Temperamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Humor / Temperamento do Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={formData.temperament}
                  onChange={(e) => setFormData({ ...formData, temperament: e.target.value })}
                  placeholder="Ex: Impaciente, fala alto, ansioso por solução rápida e desconfiado"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Linha 5: Objetivo & Frases Típicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Objetivo na Simulação
                  </label>
                  <input
                    type="text"
                    value={formData.objectives}
                    onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                    placeholder="Ex: Reativar a guia médica sem nova taxa"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Falas e Objeções Típicas
                  </label>
                  <input
                    type="text"
                    value={formData.typicalPhrases}
                    onChange={(e) => setFormData({ ...formData, typicalPhrases: e.target.value })}
                    placeholder='Ex: "Vocês me garantiram isso ontem!"'
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Linha 6: Anexo da Guia do Cliente */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>Anexo da Guia de Atendimento do Cliente</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Vincule a guia em PDF ou imagem correspondente ao atendimento deste cliente.
                    </p>
                  </div>

                  <label className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingGuide ? 'Enviando...' : 'Fazer Upload'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingGuide}
                    />
                  </label>
                </div>

                {formData.guideAttachmentUrl && (
                  <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-800 truncate text-[11px]">
                        {formData.guideAttachmentName || 'guia_atendimento.pdf'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          guideAttachmentUrl: '',
                          guideAttachmentName: '',
                        }))
                      }
                      className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                      title="Remover anexo da guia"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalState({ open: false })}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingGuide}
                  className="px-6 py-2.5 font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : 'Salvar Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DA GUIA DO CLIENTE */}
      {viewGuideModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Guia de Atendimento · {viewGuideModal.clientName}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {viewGuideModal.guideName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewGuideModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">
                  Documento Oficial de Simulação
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Guia clínica/operacional anexada ao perfil do cliente. Pronta para consulta durante a simulação prática com o atendente.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <a
                  href={viewGuideModal.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Visualizar em Nova Guia</span>
                </a>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewGuideModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Fechar Visualizador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Excluir &ldquo;{deleteConfirmModal.name}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Este cliente será removido do Banco de Clientes e desvinculado dos exercícios sem quebrar o histórico de avaliações.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
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
