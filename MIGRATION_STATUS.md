# MIGRATION_STATUS.md — PORTAL DE DESEMPENHO

**Última Atualização:** Outubro de 2026  
**Status da Evolução e Adaptação para Google AI Studio:** Concluído e Verificado (100% Funcional)

---

## 1. Tecnologias e Estrutura Identificadas

- **Runtime e Bundler:** React 19 + TypeScript + Vite + Tailwind CSS (`@tailwindcss/vite`), servindo na porta `3000` (`0.0.0.0`) em conformidade com o ambiente Google AI Studio.
- **Camada de Dados e Migração SQL:**
  - `supabase/migrations/20261009_core_portal_security.sql`: Contém a modelagem de tipos (`user_role_type`), tabelas (`profiles`, `cells`, `exercise_criteria`, `evaluations`), função de autorização centralizada (`public.check_user_permission`), políticas RLS e trigger `trg_check_cell_standard`.
  - `src/context/PortalStoreContext.tsx`: Estado transacional compartilhado com suporte a operações atômicas, prevenção de duplicatas, snapshots imutáveis de avaliação e trilha de auditoria em tempo real.
- **Módulos Implementados:**
  - `src/components/layout/PlatformShell.tsx`: Shell corporativo com a identidade verde institucional (`#0f3e2e`), marca `P` + **Portal de Desempenho**, busca global centralizada e alternador de sessão para validação de perfis.
  - `src/components/AuthLoginView.tsx`: Fluxo de autenticação com validação de conta ativa, recuperação de senha e bloqueio imediato de usuários inativos.
  - `src/modules/dashboard/views/DashboardView.tsx`: Painel inicial com indicadores agregados reais calculados a partir dos registros ativos e visão contextualizada para Administrador, Avaliador e Auxiliar.
  - `src/modules/master-checklist/views/MasterChecklistMatrixView.tsx`: Matriz de vínculos entre as 4 seções de critérios e os 10 exercícios oficiais, com cabeçalho e primeira coluna fixos (`sticky`), contadores dinâmicos e seleção individual ou por seção.
  - `src/modules/master-checklist/components/CriteriaBindingModal.tsx`: Modal **“Vincular Critérios”** isolado por `key={exercise.id}`, eliminando na raiz o bug de sobrescrita entre exercícios.
  - `src/modules/exercises/views/ExercisesCharactersView.tsx`: Gestão de Exercícios e Personagens com associação N:M real, impressão nativa (`window.print()`) e download autorizado de anexos via URL assinada (`Blob`).
  - `src/modules/evaluations/views/EvaluationsView.tsx`: Aplicação de checklists com validação obrigatória de Padrão de Atendimento da célula e gravação de `criteriaSnapshot` imutável na conclusão.
  - `src/modules/admin/views/AdminGovernanceView.tsx`: Gestão de usuários, ativação/desativação de acessos, concessão de permissões individuais, homologação de Padrão de Atendimento de células e consulta aos logs de auditoria.

---

## 2. Modelo de Permissões Identificado e Preservado

Fonte única de verdade implementada em `src/lib/permissions.ts` (`checkUserPermission`) e espelhada em SQL (`public.check_user_permission`):

1. **Administrador (`admin`):** Acesso completo a usuários, células, matriz do Checklist Mestre, exercícios, personagens, avaliações e auditoria.
2. **Avaliador (`avaliador`):** Acesso nativo para criar e consultar avaliações (`evaluations:create`, `evaluations:view`) e consultar/baixar materiais (`materials:view`, `materials:download`).
3. **Auxiliar (`auxiliar`):** Acesso nativo aos recursos de exercícios, personagens e download de PDFs (`materials:view`, `materials:download`), sem permissão administrativa ou de aplicação de avaliações restritas.
4. **Permissões Individuais (`individualPermissions`):** Ampliam de forma granular o acesso de um usuário ativo (ex.: Avaliadora Camila Nogueira com `master_checklist:manage` e `exercises:manage`), sem ignorar o bloqueio caso a conta seja desativada (`isActive: false`).

---

## 3. Problemas Críticos Identificados e Correções Executadas

1. **Bug de Sobrescrita Cruzada no Modal “Vincular Critérios”:**
   - **Causa:** Reutilização de estado local ao trocar de exercício sem remontagem do componente.
   - **Correção:** Uso de `key={exercise.id}` no `CriteriaBindingModal` e atualização transacional em `saveExerciseCriteriaLinks` que preserva todos os vínculos de `lnk.exerciseId !== exerciseId`.
2. **Alteração Retroativa de Avaliações Concluídas:**
   - **Causa:** Acoplamento direto entre avaliações históricas e vínculos dinâmicos da matriz.
   - **Correção:** Congelamento do `criteriaSnapshot` no ato da conclusão da avaliação e bloqueio de edição para registros com `status === 'completed'`.
3. **Preparação de Checklists em Células sem Padrão de Atendimento:**
   - **Causa:** Ausência de verificação prévia da célula operacional do colaborador.
   - **Correção:** Guard `validateCellEligibility(cellId)` no frontend/store e trigger `trg_check_cell_standard` no PostgreSQL.
4. **Relacionamento Rígido de Personagens por Exercício:**
   - **Causa:** Limitação artificial 1:1.
   - **Correção:** Suporte N:M real (`characterIds: string[]`), permitindo exercícios com 1, 2, 3 ou todos os 6 personagens vinculados independentemente.

---

## 4. Testes Funcionais Executados (15 Cenários Obrigatórios)

Todos os 15 cenários definidos na Seção 13 do Prompt Mestre estão implementados e verificados em `src/__tests__/portalRules.test.ts`, cobrindo autenticação, bloqueio de inativos, RBAC, permissões individuais, isolamento de edição entre usuários e exercícios, prevenção de duplicatas, cálculo de média ponderada e proteção de anexos.
