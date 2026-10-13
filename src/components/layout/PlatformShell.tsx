import React, { useMemo, useState } from 'react';
import {
  Users,
  BookOpen,
  FileText,
  ShieldCheck,
  Search,
  LogOut,
  X,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { usePortalStore } from '../../context/PortalStoreContext';

export type PortalRoute =
  | 'collaborators'
  | 'checklists'
  | 'exercises'
  | 'characters'
  | 'admin'
  | 'evaluation-run';

interface PlatformShellProps {
  activeRoute: PortalRoute;
  onNavigate: (route: PortalRoute) => void;
  children: React.ReactNode;
}

export const PlatformShell: React.FC<PlatformShellProps> = ({
  activeRoute,
  onNavigate,
  children,
}) => {
  const {
    currentUser,
    users,
    switchDemoUser,
    logout,
    hasPermission,
    collaborators,
    checklists,
    exercises,
    characters,
  } = usePortalStore();

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedCollaborators = collaborators.filter(
      (col) =>
        (col.registrationCode && col.registrationCode.toLowerCase().includes(q)) ||
        col.fullName.toLowerCase().includes(q) ||
        col.roleTitle.toLowerCase().includes(q)
    );

    const matchedChecklists = checklists.filter(
      (chk) =>
        chk.title.toLowerCase().includes(q) ||
        (chk.categoryName && chk.categoryName.toLowerCase().includes(q)) ||
        (chk.description && chk.description.toLowerCase().includes(q))
    );

    const matchedExercises = exercises.filter(
      (ex) =>
        ex.title.toLowerCase().includes(q) ||
        (ex.categoryName && ex.categoryName.toLowerCase().includes(q)) ||
        ex.scenarioInstructions.toLowerCase().includes(q)
    );

    const matchedCharacters = characters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.temperament.toLowerCase().includes(q) ||
        c.typicalPhrases.toLowerCase().includes(q)
    );

    return {
      collaborators: matchedCollaborators,
      checklists: matchedChecklists,
      exercises: matchedExercises,
      characters: matchedCharacters,
      total:
        matchedCollaborators.length +
        matchedChecklists.length +
        matchedExercises.length +
        matchedCharacters.length,
    };
  }, [globalSearchQuery, collaborators, checklists, exercises, characters]);

  if (!currentUser) return null;

  // Itens do Menu Lateral
  const navItems: Array<{
    id: PortalRoute;
    label: string;
    icon: React.ReactNode;
    visible: boolean;
    badgeCount?: number;
  }> = [
    {
      id: 'collaborators',
      label: 'Colaboradores',
      icon: <Users className="w-4 h-4" />,
      visible: true,
      badgeCount: collaborators.length,
    },
    {
      id: 'checklists',
      label: 'Checklists',
      icon: <BookOpen className="w-4 h-4" />,
      visible: true,
      badgeCount: checklists.length,
    },
    {
      id: 'exercises',
      label: 'Exercícios',
      icon: <FileText className="w-4 h-4" />,
      visible: true,
      badgeCount: exercises.length,
    },
    {
      id: 'characters',
      label: 'Banco de Clientes',
      icon: <UserCheck className="w-4 h-4" />,
      visible: true,
      badgeCount: characters.length,
    },
    {
      id: 'admin',
      label: 'Administração',
      icon: <ShieldCheck className="w-4 h-4" />,
      visible: currentUser.role === 'admin' || hasPermission('users:manage'),
    },
  ];

  const handleProfileSwitch = (targetUserId: string) => {
    setSwitchError(null);
    const res = switchDemoUser(targetUserId);
    if (!res.success) {
      setSwitchError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Bar Corporativa Verde Institucional (#0f3e2e) */}
      <header className="h-16 bg-[#0f3e2e] text-white border-b border-[#0a2c20] px-6 flex items-center justify-between gap-6 sticky top-0 z-30 no-print print:hidden">
        {/* Marca P e Título */}
        <button
          type="button"
          onClick={() => onNavigate('collaborators')}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 focus:outline-none group cursor-pointer"
        >
          <span className="w-9 h-9 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 transition-colors flex items-center justify-center font-display font-bold text-lg text-white shadow-sm">
            P
          </span>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base tracking-tight text-white leading-tight">
              Portal de Desempenho
            </span>
            <span className="text-[11px] text-emerald-300 font-medium tracking-wide">
              Treinamento & Avaliação de Atendimento
            </span>
          </div>
        </button>

        {/* Busca Global Inteligente */}
        <div className="flex-1 max-w-lg relative hidden md:block">
          <Search className="w-4 h-4 text-emerald-200/70 absolute left-3.5 top-2.5" />
          <input
            type="search"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Buscar colaboradores, checklists ou clientes..."
            className="w-full bg-white/10 text-white placeholder-emerald-200/70 text-xs rounded-lg pl-9 pr-8 py-2 border border-white/15 focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 focus:outline-none transition-all shadow-inner"
          />
          {globalSearchQuery && (
            <button
              type="button"
              onClick={() => setGlobalSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-emerald-200/70 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Resultados da Busca Global Dropdown */}
          {searchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-slate-900 max-h-96 overflow-y-auto space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-700">
                  {searchResults.total} resultado(s) para "{globalSearchQuery}"
                </span>
                <button
                  type="button"
                  onClick={() => setGlobalSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 text-[11px]"
                >
                  Fechar
                </button>
              </div>

              {searchResults.total === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">
                  Nenhum registro encontrado.
                </div>
              ) : (
                <>
                  {searchResults.collaborators.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Colaboradores ({searchResults.collaborators.length})
                      </div>
                      {searchResults.collaborators.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            onNavigate('collaborators');
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-xs flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="truncate font-medium text-slate-800">
                            {col.fullName} · {col.roleTitle}
                          </span>
                          <span className="text-emerald-700 font-semibold text-[11px] ml-2">
                            Ver Ficha →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.checklists.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Checklists ({searchResults.checklists.length})
                      </div>
                      {searchResults.checklists.map((chk) => (
                        <button
                          key={chk.id}
                          type="button"
                          onClick={() => {
                            onNavigate('checklists');
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-xs flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="truncate font-medium text-slate-800">
                            {chk.title} ({chk.categoryName || 'Geral'})
                          </span>
                          <span className="text-emerald-700 font-semibold text-[11px] ml-2">
                            Abrir →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.exercises.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Exercícios ({searchResults.exercises.length})
                      </div>
                      {searchResults.exercises.map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => {
                            onNavigate('exercises');
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-xs flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="truncate font-medium text-slate-800">
                            {ex.title}
                          </span>
                          <span className="text-emerald-700 font-semibold text-[11px] ml-2">
                            Roteiro →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.characters.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Clientes / Personagens ({searchResults.characters.length})
                      </div>
                      {searchResults.characters.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onNavigate('characters');
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-xs flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="truncate font-medium text-slate-800">
                            {c.name} ({c.temperament})
                          </span>
                          <span className="text-emerald-700 font-semibold text-[11px] ml-2">
                            Ver Perfil →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Alternador de Perfil/Sessão e Logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-200 hidden xl:inline">Usuário:</span>
            <select
              aria-label="Selecionar Usuário da Sessão"
              value={currentUser.id}
              onChange={(e) => handleProfileSwitch(e.target.value)}
              className="bg-emerald-950/90 text-white border border-emerald-700 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} (@{u.username}) · {u.role.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Sair da sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Alerta de erro ao alternar sessão se houver */}
      {switchError && (
        <div className="bg-red-500 text-white text-xs px-6 py-2 flex items-center justify-between">
          <span>{switchError}</span>
          <button
            type="button"
            onClick={() => setSwitchError(null)}
            className="text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Layout Principal com Sidebar de Acesso Rápido */}
      <div className="flex-1 flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar Fixa Desktop */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 shrink-0 hidden lg:flex flex-col justify-between no-print print:hidden">
          <div className="space-y-6">
            <div className="px-3 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Módulos Principais
              </span>
            </div>
            <nav className="space-y-1">
              {navItems
                .filter((item) => item.visible)
                .map((item) => {
                  const isActive = activeRoute === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#0f3e2e] text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {typeof item.badgeCount === 'number' && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold tabular-nums ${
                            isActive
                              ? 'bg-emerald-800 text-emerald-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
            </nav>
          </div>

          {/* Card do Usuário Logado na Base da Sidebar */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 truncate">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                {currentUser.role}
              </span>
            </div>
            <div className="text-emerald-800 font-mono text-[11px] truncate font-semibold">
              @{currentUser.username}
            </div>
            <div className="text-slate-500 text-[10px] truncate">
              {currentUser.department}
            </div>
            {currentUser.individualPermissions.length > 0 && (
              <div className="text-[10px] text-emerald-800 font-medium flex items-center gap-1 pt-1 border-t border-slate-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>{currentUser.individualPermissions.length} permissão(ões) ativa(s)</span>
              </div>
            )}
          </div>
        </aside>

        {/* Navegação Mobile / Tablet Superior */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto no-print print:hidden">
            {navItems
              .filter((item) => item.visible)
              .map((item) => {
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#0f3e2e] text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </div>

          <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto print:p-0 print:m-0 print:max-w-none">
            {children}
          </main>
        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 no-print print:hidden">
        <span>Portal de Desempenho · Simulação de Atendimento & Gestão de Treinamento</span>
        <span>Versão 2.0 · Ambiente Corporativo</span>
      </footer>
    </div>
  );
};
