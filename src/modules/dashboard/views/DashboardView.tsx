import React, { useMemo } from 'react';
import {
  CheckSquare,
  ClipboardCheck,
  Users,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import { getEffectivePermissions } from '../../../lib/permissions';

interface DashboardViewProps {
  onNavigate: (route: 'dashboard' | 'master-checklist' | 'exercises' | 'evaluations' | 'admin') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    currentUser,
    users,
    cells,
    collaborators,
    criteria,
    exercises,
    characters,
    exerciseCriteriaLinks,
    evaluations,
    auditLogs,
    hasPermission,
  } = usePortalStore();

  // Indicadores reais agregados diretamente da fonte de dados (zero contagens simuladas)
  const aggregatedMetrics = useMemo(() => {
    const activeUsersCount = users.filter((u) => u.isActive).length;
    const homologatedCellsCount = cells.filter((c) => c.hasServiceStandard).length;
    const completedEvals = evaluations.filter(
      (ev) => ev.status === 'completed' && ev.finalScore !== null
    );
    const inProgressEvalsCount = evaluations.filter(
      (ev) => ev.status === 'in_progress'
    ).length;

    const averageInstitutionalScore =
      completedEvals.length > 0
        ? Number(
            (
              completedEvals.reduce((acc, ev) => acc + (ev.finalScore || 0), 0) /
              completedEvals.length
            ).toFixed(2)
          )
        : 0;

    return {
      activeUsersCount,
      totalUsersCount: users.length,
      homologatedCellsCount,
      totalCellsCount: cells.length,
      totalCollaborators: collaborators.length,
      totalExercises: exercises.length,
      totalCharacters: characters.length,
      totalCriteria: criteria.length,
      totalMatrixLinks: exerciseCriteriaLinks.length,
      completedEvalsCount: completedEvals.length,
      inProgressEvalsCount,
      averageInstitutionalScore,
    };
  }, [
    users,
    cells,
    collaborators,
    criteria,
    exercises,
    characters,
    exerciseCriteriaLinks,
    evaluations,
  ]);

  const effectivePerms = useMemo(
    () => getEffectivePermissions(currentUser),
    [currentUser]
  );

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho Contextual por Perfil */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-emerald-800">
            Painel Operacional · Perfil Autenticado: {currentUser.role.toUpperCase()} ·{' '}
            {currentUser.department}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Olá, {currentUser.fullName}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            {currentUser.role === 'admin' &&
              'Visão executiva consolidada: acompanhe os indicadores de governança, vínculos da Matriz do Checklist Mestre, células homologadas e auditoria.'}
            {currentUser.role === 'avaliador' &&
              'Acesso rápido às avaliações de colaboradores, verificação de Padrão de Atendimento das células e consulta ao Checklist Mestre.'}
            {currentUser.role === 'auxiliar' &&
              'Consulte os exercícios de desenvolvimento, fichas de personagens vinculados e realize o download de PDFs autorizados.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {hasPermission('evaluations:create') && (
            <button
              type="button"
              onClick={() => onNavigate('evaluations')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Aplicar Avaliação</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('exercises')}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ver Exercícios & Personagens</span>
          </button>
        </div>
      </div>

      {/* Grade de Indicadores Reais Calculados do Banco */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            Checklist Mestre · Vínculos Ativos
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {aggregatedMetrics.totalMatrixLinks}
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {aggregatedMetrics.totalCriteria} critérios × {aggregatedMetrics.totalExercises} exercícios
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            Média Institucional de Avaliações
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800">
            {aggregatedMetrics.averageInstitutionalScore.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {aggregatedMetrics.completedEvalsCount} concluída(s) ·{' '}
            {aggregatedMetrics.inProgressEvalsCount} em andamento
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            Células com Padrão Homologado
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {aggregatedMetrics.homologatedCellsCount}/{aggregatedMetrics.totalCellsCount}
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {aggregatedMetrics.totalCollaborators} colaboradores mapeados
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            Acervo de Simulação (N:M)
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {aggregatedMetrics.totalExercises} Exercícios
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {aggregatedMetrics.totalCharacters} personagens ·{' '}
            {aggregatedMetrics.activeUsersCount} contas ativas
          </div>
        </div>
      </div>

      {/* Painéis Específicos de Domínio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Resumo dos 10 Exercícios e Contagem Real de Vínculos */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-700" />
                <span>Resumo da Matriz dos 10 Exercícios Oficiais</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('master-checklist')}
              className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1"
            >
              <span>Abrir Matriz Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Código</th>
                  <th className="px-4 py-2.5">Exercício</th>
                  <th className="px-4 py-2.5 text-right">Personagens (N:M)</th>
                  <th className="px-4 py-2.5 text-right">Critérios Vinculados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {exercises.slice(0, 10).map((ex) => {
                  const critCount = exerciseCriteriaLinks.filter(
                    (l) => l.exerciseId === ex.id
                  ).length;
                  return (
                    <tr key={ex.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono tabular-nums font-bold text-emerald-800">
                        {ex.code}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {ex.title}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                        {ex.characterIds.length}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {critCount}/{criteria.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coluna Direita: Status de Células e Permissões Efetivas da Sessão */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Status de Elegibilidade das Células</span>
              </h2>
              {hasPermission('cells:manage') && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  Gerenciar
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {cells.map((cell) => (
                <div
                  key={cell.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {cell.code} — {cell.name}
                    </div>
                    <div className="text-slate-500">
                      Coord.: {cell.coordinatorName}
                    </div>
                  </div>
                  <span
                    className={`font-semibold whitespace-nowrap ${
                      cell.hasServiceStandard
                        ? 'text-emerald-800'
                        : 'text-amber-700'
                    }`}
                  >
                    {cell.hasServiceStandard ? 'Padrão Ativo' : 'Padrão Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Permissões Efetivas da Sessão Atual</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-emerald-800 font-semibold">
                {effectivePerms.length} ativas
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Combinação das permissões do perfil <strong>{currentUser.role}</strong> com{' '}
              <strong>{currentUser.individualPermissions.length}</strong> permissão(ões)
              individual(is) concedida(s):
            </p>
            <div className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
              {effectivePerms.join(' · ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
