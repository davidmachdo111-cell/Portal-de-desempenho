import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Building2,
  FileSearch,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import {
  ALL_PERMISSIONS_METADATA,
  getEffectivePermissions,
} from '../../../lib/permissions';
import { PermissionKey, UserProfile, UserRole } from '../../../types/portal';

export const AdminGovernanceView: React.FC = () => {
  const {
    users,
    cells,
    collaborators,
    auditLogs,
    hasPermission,
    updateUserStatusAndPermissions,
    createNewUser,
    toggleCellServiceStandard,
  } = usePortalStore();

  const canManageUsers = hasPermission('users:manage');
  const canManageCells = hasPermission('cells:manage');
  const canViewAudit = hasPermission('audit:view');

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'cells' | 'audit'>(
    'users'
  );
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users[0]?.id || ''
  );
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || users[0] || null,
    [users, selectedUserId]
  );

  if (!canManageUsers && !canManageCells && !canViewAudit) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
        <Lock className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">
          Módulo de Administração Restrito
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Esta área exige privilégios administrativos (<code>users:manage</code>,{' '}
          <code>cells:manage</code> ou <code>audit:view</code>). A tentativa foi registrada
          no log de segurança.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Governança Corporativa · Controle de Acesso e Integridade
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Administração de Usuários, Células e Auditoria
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Gerencie perfis (Administrador, Avaliador e Auxiliar), conceda permissões
            individuais granulares, homologue Padrões de Atendimento de células e consulte
            registros de auditoria.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveSubTab('users')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'users'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Usuários & Permissões ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('cells')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'cells'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Células & Padrões ({cells.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('audit')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trilha de Auditoria ({auditLogs.length})
            </button>
          </div>

          {canManageUsers && activeSubTab === 'users' && (
            <button
              type="button"
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg flex items-center gap-2 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>Provisionar Usuário</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback */}
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

      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lista de Usuários */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Diretório de Contas</span>
              <span className="font-mono tabular-nums">{users.length} registros</span>
            </div>

            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors space-y-1 ${
                    isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="font-bold text-emerald-800 uppercase">
                      {u.role}
                    </span>
                    <span
                      className={
                        u.isActive
                          ? 'text-emerald-700 font-semibold'
                          : 'text-red-600 font-semibold'
                      }
                    >
                      {u.isActive ? 'Ativo' : 'Inativo / Bloqueado'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{u.fullName}</div>
                  <div className="text-xs text-slate-500">
                    {u.email} · {u.individualPermissions.length} permissão(ões) individual(is)
                  </div>
                </button>
              );
            })}
          </div>

          {/* Editor Isolado por Usuário (key={selectedUser.id} impede vazamento entre usuários) */}
          <div className="lg:col-span-7">
            {selectedUser && (
              <UserPermissionEditorCard
                key={selectedUser.id}
                user={selectedUser}
                canEdit={canManageUsers}
                onSave={async (payload) => {
                  const res = await updateUserStatusAndPermissions(payload);
                  setFeedback({
                    type: res.success ? 'success' : 'error',
                    text: res.message,
                  });
                }}
              />
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'cells' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Células Operacionais e Padrões de Atendimento</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                A preparação de checklists de avaliação exige que a célula esteja com o Padrão de Atendimento homologado.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <tr>
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Célula / Equipe</th>
                  <th className="px-5 py-3">Coordenação</th>
                  <th className="px-5 py-3">Colaboradores</th>
                  <th className="px-5 py-3">Documento de Padrão</th>
                  <th className="px-5 py-3">Status do Checklist</th>
                  <th className="px-5 py-3 text-right">Ação Administrativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {cells.map((cell) => {
                  const countCollabs = collaborators.filter(
                    (c) => c.cellId === cell.id
                  ).length;

                  return (
                    <tr key={cell.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-mono tabular-nums text-xs font-bold text-emerald-800">
                        {cell.code}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {cell.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">
                        {cell.coordinatorName}
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-xs text-slate-700">
                        {countCollabs}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {cell.standardDocumentTitle}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold">
                        {cell.hasServiceStandard ? (
                          <span className="text-emerald-800">
                            Homologado · Liberado
                          </span>
                        ) : (
                          <span className="text-amber-700">
                            Pendente · Bloqueado
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={!canManageCells}
                          onClick={async () => {
                            const res = await toggleCellServiceStandard(
                              cell.id,
                              !cell.hasServiceStandard
                            );
                            setFeedback({
                              type: res.success ? 'success' : 'error',
                              text: res.message,
                            });
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                            cell.hasServiceStandard
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-[#0f3e2e] hover:bg-emerald-900 text-white'
                          } disabled:opacity-50`}
                        >
                          {cell.hasServiceStandard
                            ? 'Suspender Padrão'
                            : 'Homologar Padrão'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-emerald-700" />
              <span>Registros de Auditoria e Segurança Operacional</span>
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {auditLogs.length} eventos registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <tr>
                  <th className="px-5 py-3">Data / Hora</th>
                  <th className="px-5 py-3">Usuário / Perfil</th>
                  <th className="px-5 py-3">Módulo</th>
                  <th className="px-5 py-3">Operação</th>
                  <th className="px-5 py-3">Detalhes</th>
                  <th className="px-5 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">
                        {log.actorName}
                      </div>
                      <div className="text-slate-500 uppercase font-mono text-[10px]">
                        {log.actorRole}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {log.module}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {log.targetDescription}
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      <span
                        className={
                          log.status === 'Sucesso'
                            ? 'text-emerald-800'
                            : log.status === 'Bloqueado'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Provisionamento de Novo Usuário */}
      {showCreateUserModal && (
        <CreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onSubmit={async (payload) => {
            const res = await createNewUser(payload);
            setFeedback({
              type: res.success ? 'success' : 'error',
              text: res.message,
            });
            if (res.success) {
              setShowCreateUserModal(false);
            }
          }}
        />
      )}
    </div>
  );
};

const UserPermissionEditorCard: React.FC<{
  user: UserProfile;
  canEdit: boolean;
  onSave: (payload: {
    targetUserId: string;
    role: UserRole;
    isActive: boolean;
    individualPermissions: PermissionKey[];
  }) => Promise<void>;
}> = ({ user, canEdit, onSave }) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState<boolean>(user.isActive);
  const [individualPerms, setIndividualPerms] = useState<Set<PermissionKey>>(
    () => new Set(user.individualPermissions)
  );
  const [isSaving, setIsSaving] = useState(false);

  const togglePerm = (perm: PermissionKey) => {
    setIndividualPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const previewProfile: UserProfile = {
    ...user,
    role,
    isActive,
    individualPermissions: Array.from(individualPerms),
  };

  const effectivePermissions = getEffectivePermissions(previewProfile);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        targetUserId: user.id,
        role,
        isActive,
        individualPermissions: Array.from(individualPerms),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-mono tabular-nums text-emerald-800 font-semibold">
            ID: {user.id} · {user.department}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            {user.fullName}
          </h2>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-700"
          />
          <span className="text-xs font-semibold text-slate-800">
            Conta Ativa e Autorizada
          </span>
        </label>
      </div>

      {/* Seleção do Perfil Base */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          Perfil Institucional Principal
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                key: 'admin',
                title: 'Administrador',
                desc: 'Acesso administrativo completo a todos os módulos e configurações.',
              },
              {
                key: 'avaliador',
                title: 'Avaliador',
                desc: 'Aplica checklists, registra avaliações e consulta exercícios e personagens.',
              },
              {
                key: 'auxiliar',
                title: 'Auxiliar',
                desc: 'Consulta personagens, exercícios e baixa PDFs autorizados.',
              },
            ] as const
          ).map((r) => (
            <button
              key={r.key}
              type="button"
              disabled={!canEdit}
              onClick={() => setRole(r.key)}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                role === r.key
                  ? 'border-emerald-600 bg-emerald-50/50 text-slate-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="text-xs font-bold uppercase text-emerald-900">
                {r.title}
              </div>
              <div className="text-xs text-slate-600 mt-1 leading-snug">
                {r.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Permissões Individuais Adicionais */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Permissões Individuais Granulares</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ampliam o acesso do perfil sem elevar o usuário a Administrador. Se a conta estiver inativa, nenhuma permissão tem efeito.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-emerald-800 font-semibold">
            {effectivePermissions.length} permissões efetivas
          </span>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {ALL_PERMISSIONS_METADATA.map((perm) => {
            const isDefaultInRole = perm.defaultRoles.includes(role);
            const isIndividuallyGranted = individualPerms.has(perm.key);

            return (
              <label
                key={perm.key}
                className="flex items-start justify-between gap-4 p-3 hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    disabled={!canEdit || isDefaultInRole}
                    checked={isDefaultInRole || isIndividuallyGranted}
                    onChange={() => togglePerm(perm.key)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 disabled:opacity-60"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {perm.label}{' '}
                      <code className="text-[11px] font-mono text-slate-500 ml-1">
                        ({perm.key})
                      </code>
                    </div>
                    <div className="text-xs text-slate-500">{perm.description}</div>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0">
                  {isDefaultInRole
                    ? 'Nativa do Perfil'
                    : isIndividuallyGranted
                    ? 'Concedida Individualmente'
                    : 'Não Concedida'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg transition-colors"
          >
            {isSaving
              ? 'Salvando Alterações...'
              : `Salvar Acesso de ${user.fullName}`}
          </button>
        </div>
      )}
    </div>
  );
};

const CreateUserModal: React.FC<{
  onClose: () => void;
  onSubmit: (payload: {
    fullName: string;
    email: string;
    role: UserRole;
    department: string;
    individualPermissions: PermissionKey[];
  }) => Promise<void>;
}> = ({ onClose, onSubmit }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Qualidade e Monitoria');
  const [role, setRole] = useState<UserRole>('avaliador');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      fullName,
      email,
      role,
      department,
      individualPermissions: [],
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">
          Provisionar Novo Usuário no Portal
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Fernanda Lima"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail Corporativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="fernanda.lima@portaldesempenho.corp"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Departamento / Área
            </label>
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Perfil Inicial
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="avaliador">Avaliador</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-lg"
          >
            Criar Usuário
          </button>
        </div>
      </form>
    </div>
  );
};
