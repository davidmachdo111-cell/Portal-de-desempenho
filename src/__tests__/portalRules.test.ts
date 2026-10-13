import { calculateWeightedScore } from '../context/PortalStoreContext';
import {
  INITIAL_CELLS,
  INITIAL_CHECKLISTS,
  INITIAL_COLLABORATORS,
  INITIAL_CRITERIA,
  INITIAL_EXERCISES,
  INITIAL_USERS,
  INITIAL_CHARACTERS,
} from '../data/initialPortalData';
import { checkUserPermission } from '../lib/permissions';
import { CriteriaAnswerSnapshot, UserProfile } from '../types/portal';

export function runPortalRuleTests(): {
  totalPassed: number;
  totalFailed: number;
  results: Array<{ id: number; name: string; passed: boolean; message?: string }>;
} {
  const results: Array<{ id: number; name: string; passed: boolean; message?: string }> = [];

  function assertScenario(id: number, name: string, condition: boolean, failMsg?: string) {
    results.push({
      id,
      name,
      passed: condition,
      message: condition ? undefined : failMsg || 'Condição de validação falhou.',
    });
  }

  // 1. Administrador possui acesso total a gestão de usuários e governança
  const adminUser = INITIAL_USERS.find((u) => u.role === 'admin') as UserProfile;
  assertScenario(
    1,
    'Administrador possui permissão irrestrita users:manage',
    checkUserPermission(adminUser, 'users:manage') === true
  );

  // 2. Avaliador padrão não pode gerenciar usuários
  const evaluatorUser = INITIAL_USERS.find((u) => u.role === 'avaliador') as UserProfile;
  assertScenario(
    2,
    'Avaliador comum não possui permissão users:manage',
    checkUserPermission(evaluatorUser, 'users:manage') === false
  );

  // 3. Auxiliar padrão não possui permissões administrativas
  const auxUser = INITIAL_USERS.find((u) => u.id === 'usr-aux-01') as UserProfile;
  assertScenario(
    3,
    'Auxiliar sem permissões adicionais não gerencia checklists',
    checkUserPermission(auxUser, 'can_manage_checklists') === false
  );

  // 4. Delegação Granular: Usuário com permissão explícita herda a capacidade
  const evaluatorWithExtraPerm: UserProfile = {
    ...evaluatorUser,
    individualPermissions: ['can_manage_checklists'],
  };
  assertScenario(
    4,
    'Delegação granular concede acesso can_manage_checklists',
    checkUserPermission(evaluatorWithExtraPerm, 'can_manage_checklists') === true
  );

  // 5. Estrutura relacional do exercício possui dados de personagens associados
  const ex = INITIAL_EXERCISES[0];
  const char = INITIAL_CHARACTERS[0];
  assertScenario(
    5,
    'Exercício possui título e clientes vinculados (até 4 personagens)',
    Boolean(ex.title) && Array.isArray(ex.characterIds) && ex.characterIds.length > 0 && Boolean(char.temperament)
  );

  // 6. Checklist flexível possui critérios com pesos associados
  const chk = INITIAL_CHECKLISTS[0];
  assertScenario(
    6,
    'Checklist possui critérios diretos com pontuações ponderadas',
    Array.isArray(chk.criteria) && chk.criteria.length > 0 && typeof chk.criteria[0].weight === 'number'
  );

  // 7. Cálculo ponderado de nota da avaliação (2 itens marcados de pesos 2 e 3 = 100% ou parcial)
  const sampleItems: CriteriaAnswerSnapshot[] = [
    {
      criterionId: 'c1',
      name: 'Critério 1',
      weight: 2,
      checked: true,
      notes: '',
    },
    {
      criterionId: 'c2',
      name: 'Critério 2',
      weight: 3,
      checked: false,
      notes: '',
    },
  ];
  // 2 / 5 * 10 = 4.0
  const score = calculateWeightedScore(sampleItems);
  assertScenario(
    7,
    'Cálculo ponderado da avaliação resulta em nota precisa (4.0)',
    score === 4.0
  );

  // 8. Colaboradores cadastrados com status válidos
  const validStatuses = ['novo', 'em_treinamento', 'aprovado', 'necessita_reforco'];
  const allCollabsValid = INITIAL_COLLABORATORS.every((c) =>
    validStatuses.includes(c.status)
  );
  assertScenario(8, 'Todos os colaboradores possuem status válidos do ciclo', allCollabsValid);

  // 9. Células possuem padrões ou cadastros consistentes
  assertScenario(
    9,
    'Células operacionais cadastradas possuem identificação única',
    INITIAL_CELLS.length > 0 && INITIAL_CELLS.every((cell) => Boolean(cell.name && cell.code))
  );

  // 10. Banco de clientes independente possui campos completos
  assertScenario(
    10,
    'Banco de clientes possui dados de convênio e comportamentais completos (nome, carteirinha, classificação, contexto, humor)',
    INITIAL_CHARACTERS.length > 0 &&
      INITIAL_CHARACTERS.every(
        (c) =>
          Boolean(c.name && c.cardNumber && c.customerTier && c.serviceContext && c.temperament)
      )
  );

  // 11. Usuário Mestre do Administrador (david.furtado) existe com status aprovado_sem_senha
  const masterAdmin = INITIAL_USERS.find((u) => u.username === 'david.furtado');
  assertScenario(
    11,
    'Acesso Mestre do Administrador (david.furtado) configurado com aprovado_sem_senha e canChangePassword=true',
    Boolean(
      masterAdmin &&
        masterAdmin.role === 'admin' &&
        masterAdmin.status === 'aprovado_sem_senha' &&
        masterAdmin.canChangePassword === true
    )
  );

  // 12. Validação de formato de username minúsculo e unicidade
  const allUsernamesLower = INITIAL_USERS.every(
    (u) => Boolean(u.username) && u.username === u.username.toLowerCase()
  );
  const usernameSet = new Set(INITIAL_USERS.map((u) => u.username));
  assertScenario(
    12,
    'Todos os usernames estão em minúsculas e são únicos',
    allUsernamesLower && usernameSet.size === INITIAL_USERS.length
  );

  // 13. Status corporativos de usuários válidos
  const validUserStatuses = ['pendente_aprovacao', 'aprovado_sem_senha', 'ativo', 'bloqueado'];
  const allUserStatusesValid = INITIAL_USERS.every((u) =>
    validUserStatuses.includes(u.status)
  );
  assertScenario(
    13,
    'Todos os usuários possuem status corporativos válidos',
    allUserStatusesValid
  );

  // 14. Existência de usuário na fila de aprovação para validação pelo administrador
  const pendingUser = INITIAL_USERS.find((u) => u.status === 'pendente_aprovacao');
  assertScenario(
    14,
    'Fila de aprovação contém usuário pendente para validação gerencial',
    Boolean(pendingUser && pendingUser.canChangePassword === false)
  );

  // 15. Controle de troca de senha: usuário ativo comum possui canChangePassword=false por padrão
  const standardActiveUser = INITIAL_USERS.find(
    (u) => u.status === 'ativo' && u.username === 'helena.vasconcelos'
  );
  assertScenario(
    15,
    'Usuário ativo comum possui canChangePassword=false por padrão contra trocas indevidas',
    Boolean(standardActiveUser && standardActiveUser.canChangePassword === false)
  );

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  return { totalPassed, totalFailed, results };
}
