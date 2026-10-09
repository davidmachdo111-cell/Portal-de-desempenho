import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  ClipboardCheck,
  ShieldCheck,
  Search,
  LogOut,
  X,
} from 'lucide-react';
import { usePortalStore } from '../../context/PortalStoreContext';

export type PortalRoute =
  | 'dashboard'
  | 'master-checklist'
  | 'exercises'
  | 'evaluations'
  | 'admin';

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
    exercises,
    criteria,
    characters,
  } = usePortalStore();

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Busca global centralizada no PlatformShell (conforme Seção 10 do Prompt Mestre)
  const searchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedExercises = exercises.filter(
      (ex) =>
        ex.code.toLowerCase().includes(q) ||
        ex.title.toLowerCase().includes(q)
    );
    const matchedCriteria = criteria.filter(
      (cr) =>
        cr.code.toLowerCase().includes(q) ||
        cr.name.toLowerCase().includes(q)
    );
    const matchedCharacters = characters.filter(
      (ch) =>
        ch.code.toLowerCase().includes(q) ||
        ch.name.toLowerCase().includes(q)
    );
    const matchedCollaborators = collaborators.filter(
      (col) =>
        col.registrationCode.toLowerCase().includes(q) ||
        col.fullName.toLowerCase().includes(q)
    );

    return {
      exercises: matchedExercises,
      criteria: matchedCriteria,
      characters: matchedCharacters,
      collaborators: matchedCollaborators,
      total:
        matchedExercises.length +
        matchedCriteria.length +
        matchedCharacters.length +
        matchedCollaborators.length,
    };
  }, [globalSearchQuery, exercises, criteria, characters, collaborators]);

  if (!currentUser) return null;

  const navItems: Array<{
    id: PortalRoute;
    label: string;
    icon: React.ReactNode;
    visible: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Painel Inicial',
      icon: <LayoutDashboard className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'master-checklist',
      label: 'Checklist Mestre',
      icon: <CheckSquare className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'exercises',
      label: 'Exercícios & Personagens',
      icon: <BookOpen className="w-4 h-4" />,
      visible: hasPermission('materials:view'),
    },
    {
      id: 'evaluations',
      label: 'Avaliações',
      icon: <ClipboardCheck className="w-4 h-4" />,
      visible: hasPermission('evaluations:view'),
    },
    {
      id: 'admin',
      label: 'Administração',
      icon: <ShieldCheck className="w-4 h-4" />,
      visible:
        hasPermission('users:manage') ||
        hasPermission('cells:manage') ||
        hasPermission('audit:view'),
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
      {/* Top Bar Corporativa Verde Institucional */}
      <header className="h-16 bg-[#0f3e2e] text-white border-b border-[#0a2c20] px-6 flex items-center justify-between gap-8 sticky top-0 z-30 no-print">
        {/* Zona 1: Marca com a letra P e nome Portal de Desempenho */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 focus:outline-none"
        >
          <span className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-display font-bold text-lg text-white">
            P
          </span>
          <span className="font-display font-bold text-base tracking-tight text-white">
            Portal de Desempenho
          </span>
        </button>

        {/* Zona 2: Busca Global Centralizada */}
        <div className="flex-1 max-w-lg relative hidden md:block">
          <Search className="w-4 h-4 text-emerald-200/70 absolute left-3.5 top-2.5" />
          <input
            type="search"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Busca global: critério, exercício, personagem ou colaborador..."
            className="w-full bg-white/10 text-white placeholder-emerald-200/70 text-xs rounded-lg pl-9 pr-8 py-2 border border-white/15 focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 focus:outline-none"
          />
          {globalSearchQuery && (
            <button
              type="button"
              onClick={() => setGlobalSearchQuery('')}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-2 text-emerald-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Dropdown de Resultados da Busca Global Centralizada */}
          {searchResults && (
            <div className="absolute left-0 right-0 mt-2 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-xl p-4 space-y-3 z-50 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                <span>Resultados da Busca Global</span>
                <span className="font-mono tabular-nums">
                  {searchResults.total} encontrado(s)
                </span>
              </div>

              {searchResults.total === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  Nenhum registro encontrado para &ldquo;{globalSearchQuery}&rdquo;.
                </div>
              ) : (
                <>
                  {searchResults.exercises.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-emerald-800">
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
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-xs flex items-center justify-between"
                        >
                          <span className="truncate font-medium">
                            {ex.code} — {ex.title}
                          </span>
                          <span className="text-slate-400 font-mono ml-2">
                            Abrir
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.criteria.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-emerald-800">
                        Critérios do Checklist Mestre ({searchResults.criteria.length})
                      </div>
                      {searchResults.criteria.map((cr) => (
                        <button
                          key={cr.id}
                          type="button"
                          onClick={() => {
                            onNavigate('master-checklist');
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-xs flex items-center justify-between"
                        >
                          <span className="truncate">
                            <strong>{cr.code}</strong> — {cr.name}
                          </span>
                          <span className="text-slate-400 font-mono ml-2">
                            Matriz
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.characters.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-emerald-800">
                        Personagens ({searchResults.characters.length})
                      </div>
                      {searchResults.characters.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            onNavigate('exercises');
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-xs flex items-center justify-between"
                        >
                          <span className="truncate">
                            {ch.code} — {ch.name}
                          </span>
                          <span className="text-slate-400 font-mono ml-2">
                            Ficha
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.collaborators.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-emerald-800">
                        Colaboradores ({searchResults.collaborators.length})
                      </div>
                      {searchResults.collaborators.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            onNavigate('evaluations');
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-xs flex items-center justify-between"
                        >
                          <span className="truncate">
                            {col.registrationCode} — {col.fullName}
                          </span>
                          <span className="text-slate-400 font-mono ml-2">
                            Avaliações
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

        {/* Zona 3: Alternador de Sessão / Perfil e Logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <label
              htmlFor="session-profile-switcher"
              className="text-xs text-emerald-200 hidden xl:inline whitespace-nowrap"
            >
              Sessão Ativa:
            </label>
            <select
              id="session-profile-switcher"
              value={currentUser.id}
              onChange={(e) => handleProfileSwitch(e.target.value)}
              className="bg-emerald-950/90 text-white border border-emerald-700 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role.toUpperCase()}
                  {u.individualPermissions.length > 0 ? ' + Perm. Extras' : ''}
                  {!u.isActive ? ' - INATIVO' : ''})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:text-white bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Alerta caso tente alternar para usuário inativo */}
      {switchError && (
        <div className="bg-red-600 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between no-print">
          <span>{switchError}</span>
          <button
            type="button"
            onClick={() => setSwitchError(null)}
            className="underline ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Corpo com Navegação Lateral e Área de Conteúdo */}
      <div className="flex flex-1">
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 hidden lg:flex no-print">
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
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#0f3e2e] text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </nav>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="font-semibold text-slate-900">
              {currentUser.fullName}
            </div>
            <div className="text-slate-500 font-mono uppercase text-[11px]">
              Perfil: {currentUser.role}
            </div>
            {currentUser.individualPermissions.length > 0 && (
              <div className="text-[11px] text-emerald-800 font-medium">
                +{currentUser.individualPermissions.length} permissão(ões) individual(is)
              </div>
            )}
          </div>
        </aside>

        {/* Navegação responsiva mobile/tablet */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto no-print">
            {navItems
              .filter((item) => item.visible)
              .map((item) => {
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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

          <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Rodapé Corporativo Limpo */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 no-print">
        <span>Portal de Desempenho · Gestão Corporativa de Qualidade e Desenvolvimento</span>
        <span>Idioma: Português (Brasil)</span>
      </footer>
    </div>
  );
};
