import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Building2,
  FileSearch,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Sparkles,
  X,
  KeyRound,
  UserCheck,
  UserX,
  Search,
  Clock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { usePortalStore } from '../../../context/PortalStoreContext';
import { ALL_PERMISSIONS_METADATA } from '../../../lib/permissions';
import { PermissionKey, UserProfile, UserRole } from '../../../types/portal';

export const AdminGovernanceView: React.FC = () => {
  const {
    users,
    cells,
    auditLogs,
    hasPermission,
    currentUser,
    updateUserPermissions,
    createNewUser,
    approveUser,
    rejectOrBlockUser,
    unblockUser,
    unlockPasswordChange,
  } = usePortalStore();

  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === 'pendente_aprovacao'),
    [users]
  );

  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'users' | 'audit'>(
    pendingUsers.length > 0 ? 'pending' : 'users'
  );

  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'aprovado_sem_senha' | 'bloqueado' | 'pendente_aprovacao'>('all');

  // Papel temporário selecionado para cada usuário na fila de aprovação
  const [pendingApprovalRoles, setPendingApprovalRoles] = useState<Record<string, UserRole>>({});

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || users[0] || null,
    [users, selectedUserId]
  );

  // Estados do formulário de permissões do usuário selecionado
  const [targetRole, setTargetRole] = useState<UserRole>(selectedUser?.role || 'auxiliar');
  const [targetIsActive, setTargetIsActive] = useState<boolean>(selectedUser?.isActive ?? true);
  const [targetPermissions, setTargetPermissions] = useState<PermissionKey[]>(
    selectedUser?.individualPermissions || []
  );

  // Sincroniza estado quando muda o usuário selecionado
  React.useEffect(() => {
    if (selectedUser) {
      setTargetRole(selectedUser.role);
      setTargetIsActive(selectedUser.isActive);
      setTargetPermissions(selectedUser.individualPermissions);
    }
  }, [selectedUser]);

  // Estados para criação de novo usuário
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Operações');
  const [newRole, setNewRole] = useState<UserRole>('auxiliar');
  const [newPermissions, setNewPermissions] = useState<PermissionKey[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // As 4 permissões operacionais simples
  const SIMPLIFIED_PERMISSIONS: Array<{ key: PermissionKey; label: string }> = [
    {
      key: 'can_manage_collaborators',
      label: 'Pode cadastrar e gerenciar colaboradores',
    },
    {
      key: 'can_manage_checklists',
      label: 'Pode criar checklists e critérios',
    },
    {
      key: 'can_manage_exercises',
      label: 'Pode criar exercícios e anexar guias',
    },
    {
      key: 'can_apply_evaluations',
      label: 'Pode conduzir e aplicar avaliações',
    },
  ];

  const toggleTargetPermission = (key: PermissionKey) => {
    setTargetPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleNewUserPermission = (key: PermissionKey) => {
    setNewPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    const res = await updateUserPermissions({
      targetUserId: selectedUser.id,
      role: targetRole,
      isActive: targetIsActive,
      individualPermissions: targetPermissions,
    });
    setIsSubmitting(false);

    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleApprove = async (userId: string) => {
    const role = pendingApprovalRoles[userId] || 'auxiliar';
    const res = await approveUser(userId, role);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleRejectOrBlock = async (userId: string) => {
    const res = await rejectOrBlockUser(userId);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleUnblock = async (userId: string) => {
    const res = await unblockUser(userId);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleUnlockPasswordChange = async (userId: string) => {
    const res = await unlockPasswordChange(userId);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      setFeedback({ type: 'error', text: 'Preencha o nome do usuário.' });
      return;
    }

    const emailToUse =
      newEmail.trim() ||
      `${(newUsername.trim() || newFullName.trim().toLowerCase().replace(/\s+/g, '.'))}@portaldesempenho.corp`;

    setIsSubmitting(true);
    const res = await createNewUser({
      fullName: newFullName,
      email: emailToUse,
      department: newDepartment,
      role: newRole,
      individualPermissions: newPermissions,
    });
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', text: 'Novo usuário criado com sucesso!' });
      setShowCreateUserModal(false);
      setNewFullName('');
      setNewUsername('');
      setNewEmail('');
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, userSearchQuery, statusFilter]);

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
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Controle de Acessos & Governança Corporativa
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Administração de Usuários & Senhas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Fila de aprovação de acessos, liberação de troca de senhas e delegação de competências operacionais.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center p-1 bg-slate-200/70 rounded-xl">
            {/* Aba Fila de Aprovação */}
            <button
              type="button"
              onClick={() => setActiveSubTab('pending')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Fila de Aprovação</span>
              {pendingUsers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  {pendingUsers.length}
                </span>
              )}
            </button>

            {/* Aba Usuários & Permissões */}
            <button
              type="button"
              onClick={() => setActiveSubTab('users')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'users'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Usuários & Acessos ({users.length})
            </button>

            {/* Aba Auditoria */}
            <button
              type="button"
              onClick={() => setActiveSubTab('audit')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Logs ({auditLogs.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateUserModal(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. ABA: FILA DE APROVAÇÃO (PENDENTES) */}
      {/* ======================================================== */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Fila de Solicitações de Acesso Pendentes
                </h2>
                <p className="text-xs text-amber-800 mt-0.5">
                  Novos colaboradores que solicitaram acesso através da tela de login. Ao aprovar, o usuário recebe status &quot;Aprovado sem Senha&quot; e poderá definir sua senha pessoal no primeiro login.
                </p>
              </div>
            </div>
            <div className="font-bold text-sm text-amber-950 font-mono">
              {pendingUsers.length} aguardando
            </div>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                Fila de Aprovação Vazia
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há nenhuma solicitação de acesso aguardando moderação no momento. Todos os cadastros estão revisados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((pending) => {
                const assignedRole = pendingApprovalRoles[pending.id] || 'auxiliar';

                return (
                  <div
                    key={pending.id}
                    className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          {pending.fullName}
                        </h3>
                        <div className="text-xs font-mono text-emerald-800 font-bold mt-0.5">
                          @{pending.username}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Departamento: {pending.department || 'Operações'} · Solicitado em: {new Date(pending.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                        Pendente
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Atribuir Função ao Aprovar:
                      </label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(['auxiliar', 'avaliador', 'admin'] as UserRole[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              setPendingApprovalRoles((prev) => ({
                                ...prev,
                                [pending.id]: r,
                              }))
                            }
                            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                              assignedRole === r
                                ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {r === 'auxiliar'
                              ? 'Auxiliar'
                              : r === 'avaliador'
                              ? 'Avaliador'
                              : 'Admin'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleRejectOrBlock(pending.id)}
                        className="px-3.5 py-2 text-xs font-bold text-red-700 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Recusar / Bloquear</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(pending.id)}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Aprovar Acesso</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ABA: USUÁRIOS & GESTÃO DE ACESSOS */}
      {/* ======================================================== */}
      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Lista de Usuários */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {/* Barra de Filtro e Busca */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
              <div className="relative">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou @usuario..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Todos ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ativo')}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === 'ativo'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Ativos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('aprovado_sem_senha')}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === 'aprovado_sem_senha'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  1º Acesso
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pendente_aprovacao')}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === 'pendente_aprovacao'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('bloqueado')}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    statusFilter === 'bloqueado'
                      ? 'bg-red-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Bloqueados
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((u) => {
                const isSelected = u.id === selectedUser?.id;
                const isMaster = u.username === 'david.furtado';

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-emerald-700'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {u.fullName}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-800 font-semibold">
                          @{u.username}
                        </span>
                        {isMaster && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 uppercase">
                            Mestre
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {u.role.toUpperCase()} · {u.department}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-0.5">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full block text-center ${
                          u.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.status === 'aprovado_sem_senha'
                            ? 'bg-blue-100 text-blue-800'
                            : u.status === 'pendente_aprovacao'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status === 'ativo'
                          ? 'Ativo'
                          : u.status === 'aprovado_sem_senha'
                          ? '1º Acesso'
                          : u.status === 'pendente_aprovacao'
                          ? 'Pendente'
                          : 'Bloqueado'}
                      </span>
                      {u.canChangePassword && (
                        <span className="text-[8px] font-bold text-emerald-700 block">
                          Troca liberada
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Editor de Usuário e Controles de Senha */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            {selectedUser ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Perfil do Usuário
                      </span>
                      {selectedUser.username === 'david.furtado' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">
                          Administrador Mestre
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-black text-slate-900 mt-0.5">
                      {selectedUser.fullName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Usuário: <span className="font-mono text-emerald-800 font-bold">@{selectedUser.username}</span> · {selectedUser.email}
                    </p>
                  </div>

                  {/* Badges de Status */}
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        selectedUser.status === 'ativo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedUser.status === 'aprovado_sem_senha'
                          ? 'bg-blue-100 text-blue-800'
                          : selectedUser.status === 'pendente_aprovacao'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      Status: {selectedUser.status.replace(/_/g, ' ')}
                    </span>
                    {selectedUser.canChangePassword && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ Troca de senha liberada
                      </span>
                    )}
                  </div>
                </div>

                {/* Painel de Controle de Credencial e Acesso (Requisito 5) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Ações de Segurança e Senha</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Botão: Liberar Troca de Senha */}
                    <button
                      type="button"
                      onClick={() => handleUnlockPasswordChange(selectedUser.id)}
                      className="px-3.5 py-2 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Liberar Troca de Senha</span>
                    </button>

                    {/* Botão: Bloquear / Desbloquear Usuário */}
                    {selectedUser.status === 'bloqueado' || !selectedUser.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleUnblock(selectedUser.id)}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Desbloquear Usuário</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRejectOrBlock(selectedUser.id)}
                        className="px-3.5 py-2 text-xs font-bold text-red-700 hover:text-red-900 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                        <span>Bloquear Acesso</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    O botão &quot;Liberar Troca de Senha&quot; concede permissão temporária (<span className="font-mono">can_change_password = true</span>) para o colaborador redefinir sua credencial.
                  </p>
                </div>

                {/* Perfil Base */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Função Corporativa:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label
                      className={`p-3 rounded-xl border flex flex-col cursor-pointer transition-all ${
                        targetRole === 'admin'
                          ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={targetRole === 'admin'}
                        onChange={() => setTargetRole('admin')}
                        className="hidden"
                      />
                      <span className="font-bold text-xs text-slate-900">Administrador</span>
                      <span className="text-[10px] text-slate-500 mt-1">Acesso irrestrito</span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex flex-col cursor-pointer transition-all ${
                        targetRole === 'avaliador'
                          ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="avaliador"
                        checked={targetRole === 'avaliador'}
                        onChange={() => setTargetRole('avaliador')}
                        className="hidden"
                      />
                      <span className="font-bold text-xs text-slate-900">Avaliador</span>
                      <span className="text-[10px] text-slate-500 mt-1">Aplica avaliações</span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex flex-col cursor-pointer transition-all ${
                        targetRole === 'auxiliar'
                          ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="auxiliar"
                        checked={targetRole === 'auxiliar'}
                        onChange={() => setTargetRole('auxiliar')}
                        className="hidden"
                      />
                      <span className="font-bold text-xs text-slate-900">Auxiliar / Ator</span>
                      <span className="text-[10px] text-slate-500 mt-1">Interpretação e apoio</span>
                    </label>
                  </div>
                </div>

                {/* Delegar Poderes e Permissões Individuais */}
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Delegar Poderes e Permissões Individuais:
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Conceda competências específicas a este colaborador.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {SIMPLIFIED_PERMISSIONS.map((perm) => {
                      const isChecked =
                        targetRole === 'admin' || targetPermissions.includes(perm.key);
                      const isDisabled = targetRole === 'admin';

                      return (
                        <label
                          key={perm.key}
                          className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${
                            isDisabled
                              ? 'bg-slate-100 border-slate-200 opacity-80 cursor-default'
                              : isChecked
                              ? 'bg-emerald-50/80 border-emerald-400 cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={isChecked}
                            onChange={() => toggleTargetPermission(perm.key)}
                            className="rounded text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span className="text-xs font-semibold text-slate-800">
                            ☑ {perm.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Botão de Salvar Alterações */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveUserPermissions}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Selecione um usuário para gerenciar permissões.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ABA: LOGS DE AUDITORIA */}
      {/* ======================================================== */}
      {activeSubTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Trilha de Auditoria Imutável ({auditLogs.length} eventos)
            </span>
            <span className="text-xs text-slate-500">
              Rastreamento de acessos, logins e avaliações
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Usuário</th>
                  <th className="p-3">Módulo</th>
                  <th className="p-3">Ação</th>
                  <th className="p-3">Detalhes</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {log.actorName}
                      <span className="text-[10px] text-slate-500 block font-normal">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{log.module}</td>
                    <td className="p-3 font-semibold text-slate-800">{log.action}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate" title={log.targetDescription}>
                      {log.targetDescription}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'Sucesso'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
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

      {/* ======================================================== */}
      {/* MODAL DE CRIAÇÃO (+ NOVO USUÁRIO) */}
      {/* ======================================================== */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-[#0f3e2e] text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">+ Novo Usuário</h2>
                <p className="text-xs text-emerald-200">
                  Cadastre um novo colaborador e defina sua função.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Beatriz Lima"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Usuário Corporativo (nome.sobrenome)
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().trim())}
                  placeholder="beatriz.lima"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono lowercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="beatriz.lima@portaldesempenho.corp"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Papel Inicial
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="auxiliar">Auxiliar / Ator</option>
                    <option value="avaliador">Avaliador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Poderes Iniciais */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-xs">Poderes Delegados:</span>
                <div className="space-y-1.5">
                  {SIMPLIFIED_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newPermissions.includes(perm.key)}
                        onChange={() => toggleNewUserPermission(perm.key)}
                        className="rounded text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className="text-[11px] font-medium text-slate-800">
                        {perm.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 font-bold text-white bg-[#0f3e2e] hover:bg-emerald-900 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Criando...' : 'Criar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
