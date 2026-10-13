import React, { useState } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  KeyRound,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { usePortalStore } from '../context/PortalStoreContext';
import { SetPasswordView } from './SetPasswordView';

export const AuthLoginView: React.FC = () => {
  const { users, loginWithUsername, requestAccess } = usePortalStore();

  const [authMode, setAuthMode] = useState<'login' | 'request-access' | 'set-password'>('login');
  const [username, setUsername] = useState('david.furtado');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Estados para Solicitar Primeiro Acesso
  const [reqFullName, setReqFullName] = useState('');
  const [reqUsername, setReqUsername] = useState('');
  const [reqSuccessMsg, setReqSuccessMsg] = useState<string | null>(null);
  const [reqErrorMsg, setReqErrorMsg] = useState<string | null>(null);
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  // Redirecionamento para tela de definição de senha
  const [setPasswordTargetUsername, setSetPasswordTargetUsername] = useState('david.furtado');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setErrorMsg('Informe seu usuário corporativo.');
      return;
    }

    const res = loginWithUsername(cleanUser, password);

    // Se o usuário precisa definir senha (aprovado sem senha)
    if (res.status === 'aprovado_sem_senha') {
      setSetPasswordTargetUsername(cleanUser);
      setInfoMsg(res.message);
      setTimeout(() => {
        setAuthMode('set-password');
      }, 700);
      return;
    }

    if (!res.success) {
      setErrorMsg(res.message);
    }
  };

  const handleQuickSelect = (targetUsername: string) => {
    const clean = targetUsername.toLowerCase().trim();
    setUsername(clean);
    setErrorMsg(null);
    setInfoMsg(null);

    const targetUser = users.find((u) => u.username.toLowerCase() === clean);
    if (targetUser?.status === 'aprovado_sem_senha') {
      setSetPasswordTargetUsername(clean);
      setAuthMode('set-password');
      return;
    }

    const res = loginWithUsername(clean, targetUser?.password || '');
    if (res.status === 'aprovado_sem_senha') {
      setSetPasswordTargetUsername(clean);
      setAuthMode('set-password');
      return;
    }

    if (!res.success) {
      setErrorMsg(res.message);
    }
  };

  const handleRequestAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqErrorMsg(null);
    setReqSuccessMsg(null);

    if (!reqFullName.trim() || !reqUsername.trim()) {
      setReqErrorMsg('Preencha seu nome completo e o usuário corporativo desejado.');
      return;
    }

    setIsSubmittingReq(true);
    const res = await requestAccess(reqFullName, reqUsername);
    setIsSubmittingReq(false);

    if (res.success) {
      setReqSuccessMsg(res.message);
      setReqFullName('');
      setReqUsername('');
    } else {
      setReqErrorMsg(res.message);
    }
  };

  if (authMode === 'set-password') {
    return (
      <SetPasswordView
        initialUsername={setPasswordTargetUsername || username}
        onBackToLogin={() => setAuthMode('login')}
        onSuccess={() => {
          // Após definir a senha, a store já loga o usuário automaticamente
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Coluna Institucional */}
        <div className="lg:col-span-5 bg-[#0f3e2e] text-white p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-display font-bold text-xl text-white shadow-xs">
                P
              </div>
              <span className="font-display font-bold text-lg tracking-tight">
                Portal de Desempenho
              </span>
            </div>

            <h1 className="text-2xl font-black leading-snug pt-2">
              Autenticação Corporativa & Governança de Acessos
            </h1>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Ambiente restrito com acesso baseado em usuário padrão corporativo
              (<span className="font-mono text-emerald-300">nome.sobrenome</span>),
              aprovação prévia por Administrador e controle centralizado de senhas.
            </p>
          </div>

          <div className="space-y-2.5 border-t border-emerald-800/80 pt-4 text-xs text-emerald-200">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Diretrizes de Segurança:</span>
            </div>
            <p>· Cadastro prévio com fila de aprovação gerencial</p>
            <p>· Primeiro acesso com definição obrigatória de senha</p>
            <p>· Troca de senha permitida apenas com liberação administrativa</p>
            <p>· Trilha de auditoria institucional em tempo real</p>
          </div>
        </div>

        {/* Coluna de Acesso */}
        <div className="lg:col-span-7 p-8 space-y-6">
          {authMode === 'login' ? (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Entrar no Portal
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Digite seu usuário corporativo (<span className="font-mono text-emerald-800">nome.sobrenome</span>) e senha.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{infoMsg}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuário
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                      placeholder="nome.sobrenome"
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 lowercase font-medium"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSetPasswordTargetUsername(username);
                        setAuthMode('set-password');
                      }}
                      className="text-xs font-semibold text-emerald-800 hover:underline"
                    >
                      Definir / Trocar senha
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Entrar no Portal</span>
                </button>
              </form>

              {/* Link em Destaque: Solicitar Primeiro Acesso */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-center space-y-1.5">
                <div className="text-xs text-slate-700 font-medium">
                  Novo colaborador ou ainda não possui cadastro?
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMode('request-access')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Solicitar Primeiro Acesso</span>
                </button>
              </div>

              {/* Contas Rápidas para Demonstração e Validação de Fluxos */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Acessos de Teste (Usuário & Senha):
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isMaster = u.username === 'david.furtado';
                    const isPending = u.status === 'pendente_aprovacao';
                    const isApprovedNoPass = u.status === 'aprovado_sem_senha';
                    const isBlocked = u.status === 'bloqueado' || !u.isActive;

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickSelect(u.username)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isMaster
                            ? 'bg-amber-50/60 border-amber-300 hover:bg-amber-100/60'
                            : isPending
                            ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-75'
                            : isBlocked
                            ? 'bg-red-50/50 border-red-200 hover:bg-red-100/50'
                            : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                            <span>{u.fullName}</span>
                            <span className="font-mono text-[10px] text-emerald-800">
                              (@{u.username})
                            </span>
                            {isMaster && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold uppercase">
                                Mestre
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {isPending ? (
                              <span className="text-amber-700 font-semibold">
                                Pendente de aprovação
                              </span>
                            ) : isApprovedNoPass ? (
                              <span className="text-emerald-700 font-semibold">
                                Aprovado sem senha (1º acesso)
                              </span>
                            ) : isBlocked ? (
                              <span className="text-red-700 font-semibold">
                                Bloqueado pela administração
                              </span>
                            ) : (
                              <span className="text-slate-600">
                                Perfil: <strong>{u.role}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Modo de Solicitação de Primeiro Acesso */
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setReqErrorMsg(null);
                    setReqSuccessMsg(null);
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-emerald-800 flex items-center gap-1 mb-2 cursor-pointer"
                >
                  ← Voltar para o Login
                </button>
                <h2 className="text-xl font-black text-slate-900">
                  Solicitar Primeiro Acesso
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Preencha seus dados institucionais para envio à fila de aprovação da administração.
                </p>
              </div>

              {reqErrorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{reqErrorMsg}</span>
                </div>
              )}

              {reqSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3 text-xs text-emerald-950 font-medium leading-relaxed shadow-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-emerald-900 mb-1">
                      Solicitação Registrada!
                    </div>
                    <span>{reqSuccessMsg}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleRequestAccessSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={reqFullName}
                    onChange={(e) => setReqFullName(e.target.value)}
                    placeholder="Ex: David Furtado"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuário Desejado
                  </label>
                  <input
                    type="text"
                    required
                    value={reqUsername}
                    onChange={(e) => setReqUsername(e.target.value.toLowerCase().trim())}
                    placeholder="nome.sobrenome"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono lowercase"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Utilize o padrão corporativo: <strong>nome.sobrenome</strong> (sempre em minúsculas)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isSubmittingReq ? 'Enviando...' : 'Enviar Solicitação de Acesso'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
