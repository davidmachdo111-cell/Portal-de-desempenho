import React, { useState } from 'react';
import { Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { usePortalStore } from '../context/PortalStoreContext';

export const AuthLoginView: React.FC = () => {
  const { users, loginWithEmail } = usePortalStore();

  const [email, setEmail] = useState(users[0]?.email || '');
  const [password, setPassword] = useState('••••••••••••');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRecoverySent(null);
    const res = loginWithEmail(email, password);
    if (!res.success) {
      setErrorMsg(res.message);
    }
  };

  const handleQuickSelect = (targetEmail: string) => {
    setEmail(targetEmail);
    setErrorMsg(null);
    setRecoverySent(null);
    const res = loginWithEmail(targetEmail, password);
    if (!res.success) {
      setErrorMsg(res.message);
    }
  };

  const handlePasswordRecovery = () => {
    if (!email.trim()) {
      setErrorMsg('Informe seu e-mail corporativo para solicitar a redefinição de senha.');
      return;
    }
    setErrorMsg(null);
    setRecoverySent(
      `Instruções de redefinição de senha enviadas via Supabase Auth para ${email.trim()}.`
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Coluna Institucional */}
        <div className="lg:col-span-5 bg-[#0f3e2e] text-white p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center font-display font-bold text-xl text-white">
                P
              </div>
              <span className="font-display font-bold text-lg tracking-tight">
                Portal de Desempenho
              </span>
            </div>

            <h1 className="text-2xl font-bold leading-snug pt-2">
              Plataforma Corporativa de Avaliação e Desenvolvimento
            </h1>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Acesso integrado ao Supabase Auth com validação de perfil ativo,
              permissões granulares, Checklist Mestre e snapshots imutáveis de
              avaliação.
            </p>
          </div>

          <div className="space-y-2 border-t border-emerald-800/80 pt-4 text-xs text-emerald-200">
            <div className="font-semibold text-white">
              Regras de Segurança Ativas:
            </div>
            <p>· Bloqueio automático de contas inativas ou sem perfil válido</p>
            <p>· Autorização validada por papel e permissões individuais</p>
            <p>· Trilha de auditoria para tentativas de acesso negado</p>
          </div>
        </div>

        {/* Coluna de Login e Seleção de Sessão */}
        <div className="lg:col-span-7 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Autenticação no Portal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Entre com suas credenciais institucionais ou selecione um perfil abaixo para validar as permissões.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {recoverySent && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{recoverySent}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Corporativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={handlePasswordRecovery}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  Recuperar senha
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0f3e2e] hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Acessar Portal de Desempenho</span>
            </button>
          </form>

          {/* Perfis Pré-Configurados para Validação de Matriz de Permissões */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-semibold text-slate-700">
              Acesso Rápido por Perfil (Validação de Permissões e Bloqueios):
            </div>

            <div className="grid grid-cols-1 gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSelect(u.email)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {u.fullName}{' '}
                      <span className="font-mono uppercase text-emerald-800">
                        · {u.role}
                      </span>
                      {!u.isActive && (
                        <span className="text-red-600 ml-1">
                          · (CONTA INATIVA — TESTE DE BLOQUEIO)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {u.email}
                      {u.individualPermissions.length > 0 &&
                        ` · Permissões extras: ${u.individualPermissions.join(', ')}`}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
