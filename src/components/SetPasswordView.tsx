import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { usePortalStore } from '../context/PortalStoreContext';

interface SetPasswordViewProps {
  initialUsername?: string;
  onBackToLogin: () => void;
  onSuccess?: () => void;
}

export const SetPasswordView: React.FC<SetPasswordViewProps> = ({
  initialUsername = '',
  onBackToLogin,
  onSuccess,
}) => {
  const { users, setPassword } = usePortalStore();

  const [username, setUsername] = useState(initialUsername.toLowerCase().trim());
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca dados do usuário para personalização
  const user = users.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase().trim() ||
      u.email.toLowerCase() === username.toLowerCase().trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setErrorMsg('Informe o usuário corporativo.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }

    setIsSubmitting(true);
    const res = await setPassword(cleanUser, newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(res.message);
      if (onSuccess) {
        setTimeout(() => onSuccess(), 800);
      }
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Topo Institucional */}
        <div className="bg-[#0f3e2e] text-white p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white shadow-xs">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Portal de Desempenho
              </div>
              <h1 className="text-lg font-black leading-tight text-white">
                Definir Minha Senha
              </h1>
            </div>
          </div>

          <p className="text-xs text-emerald-100/90 mt-3 leading-relaxed">
            {user?.status === 'aprovado_sem_senha'
              ? 'Seu acesso foi aprovado pela administração! Defina sua senha definitiva para ativar sua conta.'
              : user?.canChangePassword
              ? 'A troca de senha foi autorizada pelo Administrador. Cadastre sua nova credencial.'
              : 'Definição e proteção de credencial de acesso ao portal.'}
          </p>
        </div>

        {/* Formulário */}
        <div className="p-6 space-y-5">
          {/* Cartão de Identificação do Usuário */}
          {user && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">{user.fullName}</div>
                <div className="text-[11px] font-mono text-emerald-800">@{user.username}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                {user.role}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuário Corporativo
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                placeholder="nome.sobrenome"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 lowercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Mínimo de 4 caracteres
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirmação de Senha
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Definir Senha e Entrar no Portal'}</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para o Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
