/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthLoginView } from './components/AuthLoginView';
import { PlatformShell, PortalRoute } from './components/layout/PlatformShell';
import { PortalStoreProvider, usePortalStore } from './context/PortalStoreContext';
import { CollaboratorsView } from './modules/collaborators/views/CollaboratorsView';
import { ChecklistsManagementView } from './modules/checklists/views/ChecklistsManagementView';
import { ExercisesSimulationView } from './modules/exercises/views/ExercisesSimulationView';
import { CharactersManagementView } from './modules/characters/views/CharactersManagementView';
import { EvaluationExecutionView } from './modules/evaluations/views/EvaluationExecutionView';
import { AdminGovernanceView } from './modules/admin/views/AdminGovernanceView';

const PortalAppInner: React.FC = () => {
  const { currentUser, collaboratorChecklists } = usePortalStore();

  const [activeRoute, setActiveRoute] = useState<PortalRoute>('collaborators');
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);

  if (!currentUser) {
    return <AuthLoginView />;
  }

  // Ação fluida de iniciar avaliação
  const handleStartEvaluation = (assignmentId: string, collaboratorId?: string) => {
    setActiveAssignmentId(assignmentId);
    if (collaboratorId) {
      setSelectedCollaboratorId(collaboratorId);
    }
    setActiveRoute('evaluation-run');
  };

  const handleBackFromEvaluation = (collaboratorId?: string) => {
    setActiveAssignmentId(null);
    if (collaboratorId) {
      setSelectedCollaboratorId(collaboratorId);
    }
    setActiveRoute('collaborators');
  };

  // Se entrar diretamente pelo link ou atalho de avaliação
  const currentAssignmentId =
    activeAssignmentId ||
    collaboratorChecklists.find((c) => c.status === 'em_andamento')?.id ||
    collaboratorChecklists.find((c) => c.status === 'pendente')?.id ||
    collaboratorChecklists[0]?.id ||
    '';

  return (
    <PlatformShell
      activeRoute={activeRoute}
      onNavigate={(route) => {
        setActiveRoute(route);
        if (route !== 'evaluation-run') {
          setActiveAssignmentId(null);
        }
      }}
    >
      {/* 1. Colaboradores (/colaboradores) — Coração do sistema */}
      {activeRoute === 'collaborators' && (
        <CollaboratorsView
          initialCollaboratorId={selectedCollaboratorId}
          onStartEvaluation={handleStartEvaluation}
        />
      )}

      {/* 2. Checklists (/checklists) — Modelos flexíveis */}
      {activeRoute === 'checklists' && <ChecklistsManagementView />}

      {/* 3. Exercícios (/exercicios) — Roleplay e anexos */}
      {activeRoute === 'exercises' && <ExercisesSimulationView />}

      {/* 4. Banco de Clientes / Personagens (/clientes) — CRUD independente */}
      {activeRoute === 'characters' && <CharactersManagementView />}

      {/* 5. Administração (/admin) — Gestão e delegação de poderes */}
      {activeRoute === 'admin' && <AdminGovernanceView />}

      {/* 6. Tela de Avaliação em Tempo Real (/avaliacoes/executar/:id) */}
      {activeRoute === 'evaluation-run' && (
        <EvaluationExecutionView
          assignmentId={currentAssignmentId}
          onBack={handleBackFromEvaluation}
        />
      )}
    </PlatformShell>
  );
};

export default function App() {
  return (
    <PortalStoreProvider>
      <PortalAppInner />
    </PortalStoreProvider>
  );
}
