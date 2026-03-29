import {
  PrismaClient,
  ProjectRole,
  ProjectStatus,
  ProjectVisibility,
  SprintStatus,
  TaskPriority,
  TaskStatus,
  TaskVisibility,
} from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { demoUsers, SEED_DEFAULT_PASSWORD } from "../src/lib/demo-users";
import { hashPassword } from "../src/server/auth/password";

const prisma = new PrismaClient();

type TaskSeedSpec = {
  code: string;
  projectSlug: string;
  sprintName?: string;
  creatorEmail: string;
  title: string;
  summary: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  visibility: TaskVisibility;
  estimatePoints: number;
  startOffsetDays: number;
  dueOffsetDays: number;
  completedOffsetDays?: number;
  assignees: string[];
  tags: string[];
  checklist: Array<{
    content: string;
    done: boolean;
  }>;
  comments: Array<{
    authorEmail: string;
    content: string;
  }>;
  history: Array<{
    actorEmail: string;
    type: string;
    description: string;
  }>;
};

const teamSpecs = [
  {
    name: "Produto & UX",
    slug: "produto-ux",
    summary: "Responsável pela experiência, navegação e clareza do workspace.",
    focus: "Fluxos, páginas e consistência visual.",
    members: [
      { email: "marina@tcc.local", isLead: true },
      { email: "ana.rocha@tcc.local", isLead: false },
      { email: "leonardo@tcc.local", isLead: false },
    ],
  },
  {
    name: "Engenharia",
    slug: "engenharia",
    summary: "Implementação full-stack, integrações e qualidade técnica do MVP.",
    focus: "Next.js, Prisma, autenticação e entrega contínua.",
    members: [
      { email: "leonardo@tcc.local", isLead: true },
      { email: "bruno@tcc.local", isLead: false },
      { email: "caio@tcc.local", isLead: false },
      { email: "fernanda@tcc.local", isLead: false },
    ],
  },
  {
    name: "Dados & Planejamento",
    slug: "dados-planejamento",
    summary: "Métricas, cronograma, painéis e leitura de andamento do TCC.",
    focus: "Calendário, dashboard e acompanhamento da orientadora.",
    members: [
      { email: "gabriel@tcc.local", isLead: true },
      { email: "rafaela@tcc.local", isLead: false },
      { email: "marina@tcc.local", isLead: false },
      { email: "helena@tcc.local", isLead: false },
    ],
  },
] as const;

const projectSpecs = [
  {
    name: "Workspace TCC",
    slug: "workspace-tcc",
    summary: "Produto principal que consolida projetos, tarefas, equipes e calendário.",
    description:
      "Projeto central do MVP. Reúne a shell do app, regras de acesso e visão operacional do grupo.",
    status: ProjectStatus.ACTIVE,
    visibility: ProjectVisibility.WORKSPACE,
    ownerEmail: "leonardo@tcc.local",
    teamSlug: "engenharia",
    startOffsetDays: -24,
    dueOffsetDays: 55,
    members: [
      { email: "leonardo@tcc.local", role: ProjectRole.PROJECT_MANAGER },
      { email: "marina@tcc.local", role: ProjectRole.PROJECT_MANAGER },
      { email: "ana.rocha@tcc.local", role: ProjectRole.PROJECT_MEMBER },
      { email: "bruno@tcc.local", role: ProjectRole.PROJECT_MEMBER },
      { email: "caio@tcc.local", role: ProjectRole.PROJECT_MEMBER },
      { email: "fernanda@tcc.local", role: ProjectRole.PROJECT_MEMBER },
      { email: "gabriel@tcc.local", role: ProjectRole.PROJECT_VIEWER },
      { email: "helena@tcc.local", role: ProjectRole.PROJECT_VIEWER },
    ],
  },
  {
    name: "Painel de Entregas",
    slug: "painel-entregas",
    summary: "Visão de métricas, leitura executiva e acompanhamento por sprint.",
    description:
      "Área dedicada ao dashboard de evolução, indicadores do projeto e síntese para a orientadora.",
    status: ProjectStatus.ACTIVE,
    visibility: ProjectVisibility.PROJECT_MEMBERS,
    ownerEmail: "marina@tcc.local",
    teamSlug: "dados-planejamento",
    startOffsetDays: -18,
    dueOffsetDays: 35,
    members: [
      { email: "marina@tcc.local", role: ProjectRole.PROJECT_MANAGER },
      { email: "gabriel@tcc.local", role: ProjectRole.PROJECT_MEMBER },
      { email: "bruno@tcc.local", role: ProjectRole.PROJECT_MEMBER },
      { email: "fernanda@tcc.local", role: ProjectRole.PROJECT_VIEWER },
      { email: "helena@tcc.local", role: ProjectRole.PROJECT_VIEWER },
    ],
  },
  {
    name: "Calendário Acadêmico",
    slug: "calendario-academico",
    summary: "Organização do cronograma acadêmico, marcos do TCC e janelas de entrega.",
    description:
      "Projeto mais enxuto para consolidar prazos institucionais, checkpoints e visão mensal.",
    status: ProjectStatus.PLANNING,
    visibility: ProjectVisibility.PROJECT_MEMBERS,
    ownerEmail: "gabriel@tcc.local",
    teamSlug: "dados-planejamento",
    startOffsetDays: -7,
    dueOffsetDays: 42,
    members: [
      { email: "gabriel@tcc.local", role: ProjectRole.PROJECT_MANAGER },
      { email: "rafaela@tcc.local", role: ProjectRole.PROJECT_MEMBER },
      { email: "ana.rocha@tcc.local", role: ProjectRole.PROJECT_MEMBER },
      { email: "marina@tcc.local", role: ProjectRole.PROJECT_VIEWER },
      { email: "helena@tcc.local", role: ProjectRole.PROJECT_VIEWER },
    ],
  },
  {
    name: "Governança e Defesa",
    slug: "governanca-defesa",
    summary: "Preparação da banca, gestão de riscos e alinhamentos estratégicos.",
    description:
      "Espaço reservado para líderes e orientadora acompanharem riscos, checklist da defesa e decisões críticas.",
    status: ProjectStatus.ACTIVE,
    visibility: ProjectVisibility.LEADERS_ONLY,
    ownerEmail: "leonardo@tcc.local",
    teamSlug: "produto-ux",
    startOffsetDays: -10,
    dueOffsetDays: 25,
    members: [
      { email: "leonardo@tcc.local", role: ProjectRole.PROJECT_MANAGER },
      { email: "marina@tcc.local", role: ProjectRole.PROJECT_MANAGER },
      { email: "helena@tcc.local", role: ProjectRole.PROJECT_VIEWER },
    ],
  },
] as const;

const sprintSpecs = [
  {
    projectSlug: "workspace-tcc",
    name: "Sprint Fundação do MVP",
    goal: "Consolidar arquitetura, autenticação e base de dados.",
    status: SprintStatus.COMPLETED,
    startOffsetDays: -24,
    endOffsetDays: -11,
  },
  {
    projectSlug: "workspace-tcc",
    name: "Sprint Estrutura Inicial",
    goal: "Subir shell do produto, páginas base e seed demonstrável.",
    status: SprintStatus.ACTIVE,
    startOffsetDays: -10,
    endOffsetDays: 4,
  },
  {
    projectSlug: "painel-entregas",
    name: "Sprint Métricas de Leitura",
    goal: "Entregar cards, gráfico de status e visão da orientadora.",
    status: SprintStatus.ACTIVE,
    startOffsetDays: -6,
    endOffsetDays: 8,
  },
  {
    projectSlug: "calendario-academico",
    name: "Sprint Agenda Unificada",
    goal: "Organizar visão mensal e eventos acadêmicos prioritários.",
    status: SprintStatus.PLANNED,
    startOffsetDays: 2,
    endOffsetDays: 16,
  },
] as const;

const tagSpecs = [
  { name: "Arquitetura", color: "#8b5cf6" },
  { name: "Frontend", color: "#38bdf8" },
  { name: "Backend", color: "#f97316" },
  { name: "Dados", color: "#22c55e" },
  { name: "Documentação", color: "#f59e0b" },
  { name: "Planejamento", color: "#ec4899" },
] as const;

const boardColumns = [
  { name: "Backlog", position: 0, taskStatus: TaskStatus.BACKLOG },
  { name: "A fazer", position: 1, taskStatus: TaskStatus.TODO },
  { name: "Em andamento", position: 2, taskStatus: TaskStatus.IN_PROGRESS },
  { name: "Em revisão", position: 3, taskStatus: TaskStatus.REVIEW },
  { name: "Concluído", position: 4, taskStatus: TaskStatus.DONE },
] as const;

const taskSpecs: TaskSeedSpec[] = [
  {
    code: "TCC-001",
    projectSlug: "workspace-tcc",
    sprintName: "Sprint Fundação do MVP",
    creatorEmail: "leonardo@tcc.local",
    title: "Definir arquitetura simplificada do MVP",
    summary: "Fechar estrutura sem multi-tenant e responsabilidades por camada.",
    description:
      "Mapear o domínio final do produto, remover abstrações enterprise e documentar as decisões que sustentam o MVP do TCC.",
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    visibility: TaskVisibility.PROJECT,
    estimatePoints: 5,
    startOffsetDays: -23,
    dueOffsetDays: -18,
    completedOffsetDays: -18,
    assignees: ["leonardo@tcc.local", "marina@tcc.local"],
    tags: ["Arquitetura", "Planejamento"],
    checklist: [
      { content: "Eliminar conceitos de tenant e workspace dinâmico", done: true },
      { content: "Definir entidades do MVP", done: true },
      { content: "Aprovar direção da arquitetura com o grupo", done: true },
    ],
    comments: [
      {
        authorEmail: "marina@tcc.local",
        content: "A simplificação deixou o fluxo mais demonstrável para a banca.",
      },
    ],
    history: [
      {
        actorEmail: "leonardo@tcc.local",
        type: "created",
        description: "Criou a tarefa para consolidar o escopo técnico do MVP.",
      },
      {
        actorEmail: "marina@tcc.local",
        type: "completed",
        description: "Validou a arquitetura final e marcou a tarefa como concluída.",
      },
    ],
  },
  {
    code: "TCC-002",
    projectSlug: "workspace-tcc",
    sprintName: "Sprint Estrutura Inicial",
    creatorEmail: "leonardo@tcc.local",
    title: "Modelar schema Prisma sem multi-tenant",
    summary: "Representar usuários, projetos, sprints, board e tarefas no PostgreSQL.",
    description:
      "Criar um schema simples, coeso e preparado para seed e autenticação básica.",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.URGENT,
    visibility: TaskVisibility.PROJECT,
    estimatePoints: 8,
    startOffsetDays: -9,
    dueOffsetDays: 2,
    assignees: ["caio@tcc.local", "leonardo@tcc.local"],
    tags: ["Backend", "Arquitetura"],
    checklist: [
      { content: "Criar enums de roles e visibilidade", done: true },
      { content: "Modelar relações principais do domínio", done: true },
      { content: "Revisar integridade e índices principais", done: false },
    ],
    comments: [
      {
        authorEmail: "caio@tcc.local",
        content: "Os relacionamentos estão prontos, faltam apenas os ajustes finos de migração.",
      },
    ],
    history: [
      {
        actorEmail: "leonardo@tcc.local",
        type: "created",
        description: "Abriu a tarefa para estruturar o banco do projeto.",
      },
      {
        actorEmail: "caio@tcc.local",
        type: "status_changed",
        description: "Moveu a tarefa para em andamento durante a sprint atual.",
      },
    ],
  },
  {
    code: "TCC-003",
    projectSlug: "workspace-tcc",
    sprintName: "Sprint Estrutura Inicial",
    creatorEmail: "marina@tcc.local",
    title: "Montar shell inicial do dashboard",
    summary: "Criar layout lateral, páginas base e visual corporativo escuro.",
    description:
      "Estruturar a navegação principal do app com MUI e uma experiência consistente entre dashboard, projetos e tarefas.",
    status: TaskStatus.REVIEW,
    priority: TaskPriority.HIGH,
    visibility: TaskVisibility.PROJECT,
    estimatePoints: 5,
    startOffsetDays: -8,
    dueOffsetDays: 1,
    assignees: ["bruno@tcc.local", "ana.rocha@tcc.local"],
    tags: ["Frontend", "Planejamento"],
    checklist: [
      { content: "Definir navegação lateral", done: true },
      { content: "Criar componentes reutilizáveis de página", done: true },
      { content: "Validar linguagem visual do MVP", done: false },
    ],
    comments: [
      {
        authorEmail: "ana.rocha@tcc.local",
        content: "A direção está boa. Quero revisar o tratamento dos cards antes de fechar.",
      },
    ],
    history: [
      {
        actorEmail: "marina@tcc.local",
        type: "created",
        description: "Criou a estrutura inicial da tarefa de UI.",
      },
      {
        actorEmail: "bruno@tcc.local",
        type: "status_changed",
        description: "Enviou a shell para revisão após fechar a navegação base.",
      },
    ],
  },
  {
    code: "TCC-004",
    projectSlug: "workspace-tcc",
    sprintName: "Sprint Estrutura Inicial",
    creatorEmail: "fernanda@tcc.local",
    title: "Configurar seed com dados reais do grupo",
    summary: "Popular o ambiente com dados úteis para demonstração da aplicação.",
    description:
      "Criar seed contendo usuários, times, projetos, sprints, tarefas, comentários e checklist com contexto do TCC.",
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    visibility: TaskVisibility.PROJECT,
    estimatePoints: 3,
    startOffsetDays: -4,
    dueOffsetDays: 3,
    assignees: ["fernanda@tcc.local", "gabriel@tcc.local"],
    tags: ["Dados", "Documentação"],
    checklist: [
      { content: "Definir 9 usuários e roles", done: true },
      { content: "Criar projetos e sprints de demonstração", done: false },
      { content: "Revisar tarefas e comentários gerados", done: false },
    ],
    comments: [
      {
        authorEmail: "gabriel@tcc.local",
        content: "Assim que o schema estabilizar eu fecho a base de dados demonstrável.",
      },
    ],
    history: [
      {
        actorEmail: "fernanda@tcc.local",
        type: "created",
        description: "Criou a tarefa para garantir um seed rico para a apresentação.",
      },
    ],
  },
  {
    code: "TCC-005",
    projectSlug: "painel-entregas",
    sprintName: "Sprint Métricas de Leitura",
    creatorEmail: "marina@tcc.local",
    title: "Criar cards de métricas de entrega",
    summary: "Exibir volume de tarefas, andamento e ritmo de sprint no dashboard.",
    description:
      "Montar visão executiva simples com indicadores que mostrem progresso do grupo e gargalos da sprint.",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    visibility: TaskVisibility.PROJECT,
    estimatePoints: 5,
    startOffsetDays: -5,
    dueOffsetDays: 5,
    assignees: ["gabriel@tcc.local", "bruno@tcc.local"],
    tags: ["Dados", "Frontend"],
    checklist: [
      { content: "Definir indicadores principais", done: true },
      { content: "Criar gráfico de status por tarefa", done: false },
      { content: "Ajustar leitura para a orientadora", done: false },
    ],
    comments: [
      {
        authorEmail: "gabriel@tcc.local",
        content: "Já tenho os números agregados, falta finalizar a apresentação na UI.",
      },
    ],
    history: [
      {
        actorEmail: "marina@tcc.local",
        type: "created",
        description: "Abriu o trabalho para fechar a visão analítica do MVP.",
      },
      {
        actorEmail: "gabriel@tcc.local",
        type: "status_changed",
        description: "Iniciou a construção do painel de métricas.",
      },
    ],
  },
  {
    code: "TCC-006",
    projectSlug: "painel-entregas",
    sprintName: "Sprint Métricas de Leitura",
    creatorEmail: "marina@tcc.local",
    title: "Ajustar leitura da orientadora no painel",
    summary: "Refinar a experiência de acompanhamento com linguagem mais executiva.",
    description:
      "Reduzir ruído operacional e priorizar uma leitura clara para a orientadora acompanhar decisões e risco.",
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    visibility: TaskVisibility.ASSIGNEES,
    estimatePoints: 3,
    startOffsetDays: -2,
    dueOffsetDays: 7,
    assignees: ["marina@tcc.local", "helena@tcc.local"],
    tags: ["Planejamento", "Dados"],
    checklist: [
      { content: "Reduzir termos técnicos nas métricas", done: false },
      { content: "Destacar próximos marcos", done: false },
    ],
    comments: [
      {
        authorEmail: "helena@tcc.local",
        content: "Quero uma visão rápida de avanço, riscos e próximos passos.",
      },
    ],
    history: [
      {
        actorEmail: "marina@tcc.local",
        type: "created",
        description: "Criou a tarefa após feedback da orientadora sobre o painel.",
      },
    ],
  },
  {
    code: "TCC-007",
    projectSlug: "calendario-academico",
    sprintName: "Sprint Agenda Unificada",
    creatorEmail: "gabriel@tcc.local",
    title: "Consolidar cronograma acadêmico e sprints",
    summary: "Juntar prazos institucionais com o plano interno do grupo.",
    description:
      "Criar uma agenda única que conecte banca, checkpoints do curso e entregas do produto.",
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    visibility: TaskVisibility.PROJECT,
    estimatePoints: 5,
    startOffsetDays: 1,
    dueOffsetDays: 10,
    assignees: ["rafaela@tcc.local", "gabriel@tcc.local"],
    tags: ["Planejamento", "Dados"],
    checklist: [
      { content: "Mapear datas da universidade", done: false },
      { content: "Cruzar cronograma do produto com banca", done: false },
      { content: "Publicar visão mensal inicial", done: false },
    ],
    comments: [
      {
        authorEmail: "rafaela@tcc.local",
        content: "Já levantei os eventos fixos, vou amarrar com as sprints do grupo.",
      },
    ],
    history: [
      {
        actorEmail: "gabriel@tcc.local",
        type: "created",
        description: "Abriu a frente de calendário para integrar datas críticas.",
      },
    ],
  },
  {
    code: "TCC-008",
    projectSlug: "calendario-academico",
    sprintName: "Sprint Agenda Unificada",
    creatorEmail: "ana.rocha@tcc.local",
    title: "Desenhar visão mensal do calendário",
    summary: "Estruturar um calendário simples, elegante e consistente com o dashboard.",
    description:
      "Criar a visualização mensal do calendário preservando a linguagem visual do produto e a leitura rápida.",
    status: TaskStatus.BACKLOG,
    priority: TaskPriority.MEDIUM,
    visibility: TaskVisibility.PROJECT,
    estimatePoints: 3,
    startOffsetDays: 4,
    dueOffsetDays: 14,
    assignees: ["ana.rocha@tcc.local"],
    tags: ["Frontend", "Planejamento"],
    checklist: [
      { content: "Definir grid mensal", done: false },
      { content: "Tratar eventos e prazos no mesmo componente", done: false },
    ],
    comments: [],
    history: [
      {
        actorEmail: "ana.rocha@tcc.local",
        type: "created",
        description: "Criou a ideia de UI para a futura visão mensal.",
      },
    ],
  },
  {
    code: "TCC-009",
    projectSlug: "governanca-defesa",
    creatorEmail: "leonardo@tcc.local",
    title: "Preparar checklist da banca final",
    summary: "Consolidar entregáveis, materiais e revisões necessárias para a defesa.",
    description:
      "Organizar os itens críticos da banca final em uma checklist visível apenas para líderes e orientadora.",
    status: TaskStatus.TODO,
    priority: TaskPriority.URGENT,
    visibility: TaskVisibility.LEADERS_ONLY,
    estimatePoints: 5,
    startOffsetDays: -1,
    dueOffsetDays: 12,
    assignees: ["leonardo@tcc.local", "marina@tcc.local"],
    tags: ["Documentação", "Planejamento"],
    checklist: [
      { content: "Revisar roteiro da apresentação", done: false },
      { content: "Fechar materiais da banca", done: false },
      { content: "Validar narrativa do produto", done: false },
    ],
    comments: [
      {
        authorEmail: "helena@tcc.local",
        content: "Quero acompanhar os itens críticos, mas sem misturar com as tarefas operacionais.",
      },
    ],
    history: [
      {
        actorEmail: "leonardo@tcc.local",
        type: "created",
        description: "Criou uma checklist restrita para a preparação da defesa.",
      },
    ],
  },
  {
    code: "TCC-010",
    projectSlug: "governanca-defesa",
    creatorEmail: "marina@tcc.local",
    title: "Revisar riscos e plano de contingência",
    summary: "Atualizar riscos do projeto e respostas para atrasos ou bloqueios.",
    description:
      "Levantar riscos de prazo, integração e apresentação, com uma resposta simples para cada cenário.",
    status: TaskStatus.REVIEW,
    priority: TaskPriority.HIGH,
    visibility: TaskVisibility.LEADERS_ONLY,
    estimatePoints: 3,
    startOffsetDays: -6,
    dueOffsetDays: 6,
    assignees: ["leonardo@tcc.local"],
    tags: ["Arquitetura", "Planejamento"],
    checklist: [
      { content: "Listar riscos por frente", done: true },
      { content: "Definir responsáveis", done: true },
      { content: "Validar plano com a orientadora", done: false },
    ],
    comments: [
      {
        authorEmail: "marina@tcc.local",
        content: "A base está pronta. Falta alinhar os riscos mais críticos com a professora Helena.",
      },
    ],
    history: [
      {
        actorEmail: "marina@tcc.local",
        type: "created",
        description: "Criou a revisão de riscos para a frente de governança.",
      },
      {
        actorEmail: "leonardo@tcc.local",
        type: "status_changed",
        description: "Moveu a tarefa para revisão após consolidar o plano inicial.",
      },
    ],
  },
];

async function resetDatabase() {
  await prisma.taskHistory.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskChecklistItem.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.taskTag.deleteMany();
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.board.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

export async function main() {
  await resetDatabase();

  const passwordHash = await hashPassword(SEED_DEFAULT_PASSWORD);

  const users = new Map<string, { id: string; name: string }>();

  for (const user of demoUsers) {
    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        title: user.title,
        avatarColor: user.avatarColor,
      },
    });

    users.set(user.email, { id: created.id, name: created.name });
  }

  const teams = new Map<string, { id: string; name: string }>();

  for (const team of teamSpecs) {
    const createdTeam = await prisma.team.create({
      data: {
        name: team.name,
        slug: team.slug,
        summary: team.summary,
        focus: team.focus,
      },
    });

    teams.set(team.slug, { id: createdTeam.id, name: createdTeam.name });

    await prisma.teamMember.createMany({
      data: team.members.map((member) => ({
        teamId: createdTeam.id,
        userId: users.get(member.email)!.id,
        isLead: member.isLead,
      })),
    });
  }

  const projects = new Map<string, { id: string; name: string }>();

  for (const project of projectSpecs) {
    const createdProject = await prisma.project.create({
      data: {
        name: project.name,
        slug: project.slug,
        summary: project.summary,
        description: project.description,
        status: project.status,
        visibility: project.visibility,
        ownerId: users.get(project.ownerEmail)!.id,
        teamId: teams.get(project.teamSlug)?.id,
        startDate: subDays(new Date(), Math.abs(project.startOffsetDays)),
        dueDate: addDays(new Date(), project.dueOffsetDays),
      },
    });

    projects.set(project.slug, { id: createdProject.id, name: createdProject.name });

    await prisma.projectMember.createMany({
      data: project.members.map((member) => ({
        projectId: createdProject.id,
        userId: users.get(member.email)!.id,
        role: member.role,
      })),
    });
  }

  const sprints = new Map<string, { id: string; projectSlug: string }>();

  for (const sprint of sprintSpecs) {
    const createdSprint = await prisma.sprint.create({
      data: {
        name: sprint.name,
        goal: sprint.goal,
        status: sprint.status,
        projectId: projects.get(sprint.projectSlug)!.id,
        startDate:
          sprint.startOffsetDays < 0
            ? subDays(new Date(), Math.abs(sprint.startOffsetDays))
            : addDays(new Date(), sprint.startOffsetDays),
        endDate:
          sprint.endOffsetDays < 0
            ? subDays(new Date(), Math.abs(sprint.endOffsetDays))
            : addDays(new Date(), sprint.endOffsetDays),
      },
    });

    sprints.set(sprint.name, { id: createdSprint.id, projectSlug: sprint.projectSlug });
  }

  const columnsByProject = new Map<string, Map<TaskStatus, string>>();

  for (const project of projectSpecs) {
    const board = await prisma.board.create({
      data: {
        name: `${project.name} Board`,
        projectId: projects.get(project.slug)!.id,
        columns: {
          create: boardColumns.map((column) => ({
            name: column.name,
            position: column.position,
            taskStatus: column.taskStatus,
          })),
        },
      },
      include: {
        columns: true,
      },
    });

    columnsByProject.set(
      project.slug,
      new Map(board.columns.map((column) => [column.taskStatus, column.id])),
    );
  }

  const tags = new Map<string, string>();

  for (const tag of tagSpecs) {
    const createdTag = await prisma.tag.create({
      data: tag,
    });

    tags.set(tag.name, createdTag.id);
  }

  for (const task of taskSpecs) {
    const projectId = projects.get(task.projectSlug)!.id;
    const sprintId = task.sprintName ? sprints.get(task.sprintName)?.id : undefined;
    const boardColumnId = columnsByProject.get(task.projectSlug)?.get(task.status);

    await prisma.task.create({
      data: {
        code: task.code,
        title: task.title,
        summary: task.summary,
        description: task.description,
        status: task.status,
        priority: task.priority,
        visibility: task.visibility,
        estimatePoints: task.estimatePoints,
        projectId,
        sprintId,
        boardColumnId,
        creatorId: users.get(task.creatorEmail)!.id,
        startDate:
          task.startOffsetDays < 0
            ? subDays(new Date(), Math.abs(task.startOffsetDays))
            : addDays(new Date(), task.startOffsetDays),
        dueDate:
          task.dueOffsetDays < 0
            ? subDays(new Date(), Math.abs(task.dueOffsetDays))
            : addDays(new Date(), task.dueOffsetDays),
        completedAt:
          task.completedOffsetDays === undefined
            ? null
            : task.completedOffsetDays < 0
              ? subDays(new Date(), Math.abs(task.completedOffsetDays))
              : addDays(new Date(), task.completedOffsetDays),
        assignees: {
          create: task.assignees.map((email) => ({
            userId: users.get(email)!.id,
          })),
        },
        tags: {
          create: task.tags.map((name) => ({
            tagId: tags.get(name)!,
          })),
        },
        checklistItems: {
          create: task.checklist.map((item, index) => ({
            content: item.content,
            done: item.done,
            position: index,
          })),
        },
        comments: {
          create: task.comments.map((comment) => ({
            content: comment.content,
            authorId: users.get(comment.authorEmail)!.id,
          })),
        },
        historyEntries: {
          create: task.history.map((entry) => ({
            type: entry.type,
            description: entry.description,
            actorId: users.get(entry.actorEmail)!.id,
          })),
        },
      },
    });
  }

  console.log("Seed finalizado.");
  console.log(`Usuários criados: ${demoUsers.length}`);
  console.log(`Senha padrão: ${SEED_DEFAULT_PASSWORD}`);
  await prisma.$disconnect();
}
