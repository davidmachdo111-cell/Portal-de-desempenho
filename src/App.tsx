/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthLoginView } from './components/AuthLoginView';
import { PlatformShell, PortalRoute } from './components/layout/PlatformShell';
import {
  PortalStoreProvider,
  usePortalStore,
} from './context/PortalStoreContext';
import { AdminGovernanceView } from './modules/admin/views/AdminGovernanceView';
import { DashboardView } from './modules/dashboard/views/DashboardView';
import { EvaluationsView } from './modules/evaluations/views/EvaluationsView';
import { ExercisesCharactersView } from './modules/exercises/views/ExercisesCharactersView';
import { MasterChecklistMatrixView } from './modules/master-checklist/views/MasterChecklistMatrixView';

const PortalAuthenticatedRouter: React.FC = () => {
  const { currentUser } = usePortalStore();
  const [activeRoute, setActiveRoute] = useState<PortalRoute>('dashboard');

  // Redirecionamento automático para autenticação quando não houver sessão válida ou usuário estiver inativo
  if (!currentUser || !currentUser.isActive) {
    return <AuthLoginView />;
  }

  return (
    <PlatformShell activeRoute={activeRoute} onNavigate={setActiveRoute}>
      {activeRoute === 'dashboard' && (
        <DashboardView onNavigate={setActiveRoute} />
      )}
      {activeRoute === 'master-checklist' && <MasterChecklistMatrixView />}
      {activeRoute === 'exercises' && <ExercisesCharactersView />}
      {activeRoute === 'evaluations' && <EvaluationsView />}
      {activeRoute === 'admin' && <AdminGovernanceView />}
    </PlatformShell>
  );
};

export default function App() {
  return (
    <PortalStoreProvider>
      <PortalAuthenticatedRouter />
    </PortalStoreProvider>
  );
}
