import React, { useMemo, useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  User,
  BookOpen,
  ArrowLeft,
  Award,
  Eye,
  FileText,
  Download,
  CheckSquare,
  Square,
  Paperclip,
  Check,
  CreditCard,
  ExternalLink,
  Printer,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import {
  CollaboratorStatus,
  CriteriaAnswerSnapshot,
  Exercise,
  Character,
} from '../../../types/portal';
import { CUSTOMER_TIER_BADGES } from '../../characters/views/CharactersManagementView';

interface EvaluationExecutionViewProps {
  assignmentId: string;
  onBack: (collaboratorId?: string) => void;
}

export const EvaluationExecutionView: React.FC<EvaluationExecutionViewProps> = ({
  assignmentId,
  onBack,
}) => {
  const {
    collaboratorChecklists,
    collaborators,
    checklists,
    exercises,
    characters,
    currentUser,
    hasPermission,
    completeEvaluation,
  } = usePortalStore();

  const isAuxiliar = currentUser?.role === 'auxiliar';
  const canApplyEvaluations = hasPermission('can_apply_evaluations') && !isAuxiliar;

  // Localiza a atribuição ativa
  const assignment = useMemo(
    () => collaboratorChecklists.find((c) => c.id === assignmentId),
    [collaboratorChecklists, assignmentId]
  );

  const collaborator = useMemo(
    () => (assignment ? collaborators.find((c) => c.id === assignment.collaboratorId) : null),
    [assignment, collaborators]
  );

  const checklist = useMemo(
    () => (assignment ? checklists.find((c) => c.id === assignment.checklistId) : null),
    [assignment, checklists]
  );

  // Cenário de exercício vinculado (se houver)
  const currentExercise = useMemo(() => {
    if (!checklist || !checklist.exerciseIds || checklist.exerciseIds.length === 0) return null;
    return exercises.find((e) => e.id === checklist.exerciseIds[0]) || null;
  }, [checklist, exercises]);

  // Clientes vinculados ao exercício
  const exerciseCharacters = useMemo(() => {
    if (!currentExercise) return [];
    return currentExercise.characterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter(Boolean) as Character[];
  }, [currentExercise, characters]);

  // Critérios diretos do checklist
  const [criteriaState, setCriteriaState] = useState<CriteriaAnswerSnapshot[]>(() => {
    if (assignment && assignment.criteriaAnswers && assignment.criteriaAnswers.length > 0) {
      return assignment.criteriaAnswers;
    }
    if (checklist) {
      return checklist.criteria.map((c) => ({
        criterionId: c.id,
        name: c.name,
        weight: c.weight,
        checked: false,
        notes: '',
      }));
    }
    return [];
  });

  // Cálculo da nota ponderada em tempo real (0 a 10)
  const currentScore = useMemo(() => {
    if (criteriaState.length === 0) return 10;
    let totalPossibleWeight = 0;
    let earnedWeight = 0;

    criteriaState.forEach((item) => {
      const w = item.weight || 1;
      totalPossibleWeight += w;
      if (item.checked) {
        earnedWeight += w;
      }
    });

    if (totalPossibleWeight === 0) return 10;
    return Math.round((earnedWeight / totalPossibleWeight) * 100) / 10;
  }, [criteriaState]);

  const [selectedResultStatus, setSelectedResultStatus] = useState<CollaboratorStatus>('aprovado');
  const [generalObservations, setGeneralObservations] = useState<string>(
    assignment?.generalObservations || ''
  );
  const [isFinishing, setIsFinishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!assignment || !collaborator || !checklist) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Avaliação não encontrada</h2>
        <p className="text-xs text-slate-500">
          O registro de avaliação solicitado não existe ou foi removido.
        </p>
        <button
          type="button"
          onClick={() => onBack(collaborator?.id)}
          className="px-4 py-2 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-colors cursor-pointer"
        >
          Voltar para a Ficha
        </button>
      </div>
    );
  }

  const handleToggleCheck = (criterionId: string) => {
    if (!canApplyEvaluations) return;
    setCriteriaState((prev) =>
      prev.map((item) =>
        item.criterionId === criterionId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleUpdateNotes = (criterionId: string, notes: string) => {
    if (!canApplyEvaluations) return;
    setCriteriaState((prev) =>
      prev.map((item) => (item.criterionId === criterionId ? { ...item, notes } : item))
    );
  };

  const handleFinishEvaluation = async () => {
    if (!canApplyEvaluations) {
      setFeedback({ type: 'error', text: 'Você não possui permissão para finalizar avaliações.' });
      return;
    }

    setIsFinishing(true);
    const res = await completeEvaluation({
      collaboratorChecklistId: assignment.id,
      criteriaAnswers: criteriaState,
      finalScore: currentScore,
      generalObservations: generalObservations.trim() || undefined,
      instructorAuxiliarId: currentUser?.id,
      updateCollaboratorStatus: selectedResultStatus,
    });
    setIsFinishing(false);

    if (res.success) {
      setFeedback({ type: 'success', text: 'Avaliação concluída e registrada com sucesso!' });
      setTimeout(() => {
        onBack(collaborator?.id);
      }, 1200);
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Header com Botão de Voltar e Identificação */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onBack(collaborator?.id)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0f3e2e] bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Ficha do Colaborador</span>
        </button>

        <span className="text-xs text-slate-500 font-medium">
          Avaliador Atual: <strong>{currentUser?.fullName}</strong>
        </span>
      </div>

      {/* Banner Principal com Placar de Nota em Tempo Real */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {checklist.categoryName || 'Avaliação Operacional'}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">
              Colaborador: <strong>{collaborator.fullName}</strong> ({collaborator.roleTitle})
            </span>
          </div>

          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            {checklist.title}
          </h1>

          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            {checklist.description ||
              'Marque os critérios atendidos durante o atendimento simulado. A nota ponderada é calculada automaticamente em tempo real.'}
          </p>
        </div>

        {/* Card de Pontuação Dinâmica */}
        <div className="bg-[#0f3e2e] text-white p-5 rounded-2xl flex items-center gap-5 shrink-0 shadow-md">
          <div className="space-y-0.5">
            <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
              Nota Calculada
            </div>
            <div className="text-4xl font-black font-mono tracking-tight text-white">
              {currentScore.toFixed(1)}
            </div>
            <div className="text-[10px] text-emerald-200">em tempo real</div>
          </div>
          <div className="h-10 w-px bg-emerald-800" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Status</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                currentScore >= 7
                  ? 'bg-emerald-800/80 text-emerald-100'
                  : 'bg-amber-800/80 text-amber-100'
              }`}
            >
              {currentScore >= 7 ? 'Pontuação Apta' : 'Abaixo da Média'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Principal: Coluna Esquerda (Critérios Interativos) e Coluna Direita (Briefing do Caso) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LISTA DE CRITÉRIOS DE AVALIAÇÃO */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-700" />
                <span>Critérios de Avaliação ({criteriaState.length})</span>
              </h2>
              <span className="text-[11px] text-slate-500">
                Clique nos itens atendidos para pontuar
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
              {criteriaState.filter((c) => c.checked).length} / {criteriaState.length} Concluídos
            </span>
          </div>

          <div className="space-y-3">
            {criteriaState.map((crit) => (
              <div
                key={crit.criterionId}
                onClick={() => handleToggleCheck(crit.criterionId)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  crit.checked
                    ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    {crit.checked ? (
                      <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 leading-snug">
                        {crit.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                        Peso {crit.weight}
                      </span>
                    </div>

                    {/* Observação / Feedback Opcional */}
                    <div
                      className="mt-2.5 pt-2 border-t border-slate-100/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={crit.notes || ''}
                        onChange={(e) => handleUpdateNotes(crit.criterionId, e.target.value)}
                        placeholder="Adicionar apontamento ou observação deste critério..."
                        className="w-full text-[11px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Seção de Conclusão da Avaliação */}
          <div className="pt-5 border-t border-slate-200 space-y-4">
            {/* Campo Amplo: Observações Gerais / Feedback do Instrutor */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Observações Gerais / Feedback do Instrutor</span>
                <span className="text-[10px] text-slate-400 font-normal">Exibido no Relatório de Avaliação</span>
              </label>
              <textarea
                rows={4}
                value={generalObservations}
                onChange={(e) => setGeneralObservations(e.target.value)}
                placeholder="Digite anotações gerais sobre o desempenho, postura, empatia, aderência aos processos e oportunidades de melhoria do colaborador durante o atendimento..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 text-xs placeholder-slate-400 leading-relaxed resize-y"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-900">
                Resultado / Próximo Status do Colaborador:
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedResultStatus('aprovado')}
                  className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    selectedResultStatus === 'aprovado'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ✓ Aprovado na Etapa
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedResultStatus('necessita_reforco')}
                  className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    selectedResultStatus === 'necessita_reforco'
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ⚠ Necessita Reforço
                </button>
              </div>
            </div>

            {/* Apenas Administradores e Avaliadores podem concluir e registrar; Auxiliar não tem esse botão */}
            {isAuxiliar ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center font-medium">
                Perfil de Acompanhamento (Auxiliar): Esta visualização é de consulta ao roteiro e critérios. O registro e finalização da avaliação são exclusivos de Avaliadores e Administradores.
              </div>
            ) : (
              <button
                type="button"
                disabled={isFinishing || !canApplyEvaluations}
                onClick={handleFinishEvaluation}
                className="w-full py-3.5 bg-[#0f3e2e] hover:bg-emerald-900 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isFinishing ? 'Gravando Resultado...' : 'Finalizar e Registrar Avaliação'}</span>
              </button>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: CENÁRIO DE SIMULAÇÃO E CLIENTES (ROLEPLAY) */}
        <div
          id="printable-roteiro"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 print:p-8 print:border-none"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Cenário de Roleplay & Clientes</span>
            </div>
            {currentExercise && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  Dificuldade: {currentExercise.difficulty || 'Mediano'}
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs no-print"
                  title="Baixar Roteiro em PDF ou Imprimir"
                >
                  <Printer className="w-3 h-3 text-emerald-700" />
                  <span>Baixar Roteiro</span>
                </button>
              </div>
            )}
          </div>

          {currentExercise ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase">
                  {currentExercise.categoryName || 'Exercício'}
                </span>
                <h3 className="text-base font-bold text-slate-900 leading-snug mt-0.5">
                  {currentExercise.title}
                </h3>
              </div>

              {/* Roteiro e Orientações do Caso */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-800 uppercase text-[11px] tracking-wide">
                  Orientações do Caso:
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  {currentExercise.scenarioInstructions}
                </div>
              </div>

              {/* Clientes a Serem Interpretados */}
              {exerciseCharacters.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="font-bold text-slate-800 uppercase text-[11px] tracking-wide">
                    Personagens do Atendimento ({exerciseCharacters.length}):
                  </div>
                  <div className="space-y-3">
                    {exerciseCharacters.map((char) => {
                      const tierBadge =
                        CUSTOMER_TIER_BADGES[char.customerTier || 'Mediano'] ||
                        CUSTOMER_TIER_BADGES['Mediano'];

                      return (
                        <div
                          key={char.id}
                          className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2"
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

                          <p className="text-slate-700 text-[11px] leading-relaxed">
                            <strong>Contexto:</strong> {char.serviceContext || char.history}
                          </p>

                          <p className="text-slate-700 text-[11px] leading-relaxed">
                            <strong>Humor:</strong> {char.temperament}
                          </p>

                          <p className="text-slate-700 text-[11px] leading-relaxed">
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
                            <div className="pt-1.5">
                              <a
                                href={char.guideAttachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 px-3 bg-white hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Abrir Guia Anexa de {char.name.split(' ')[0]}</span>
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2 border border-dashed border-slate-200 rounded-xl">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Este checklist não possui cenários de roleplay ou clientes associados.</p>
              <p className="text-[11px] text-slate-400">
                A avaliação é conduzida com base unicamente na observação direta dos critérios.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
