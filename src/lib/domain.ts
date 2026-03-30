import {
  GlobalRole,
  ProjectComplexity,
  ProjectPriority,
  ProjectStatus,
  ProjectVisibility,
  SprintStatus,
  FlowchartScopeType,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskVisibility,
} from "@prisma/client";

export const roleLabels: Record<GlobalRole, string> = {
  ADMIN: "Admin",
  MEMBER: "Membro",
  COLLABORATOR: "Colaborador",
  ADVISOR: "Orientadora",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  PLANNING: "Planejamento",
  ACTIVE: "Ativo",
  AT_RISK: "Em risco",
  ON_HOLD: "Pausado",
  COMPLETED: "Concluído",
};

export const projectPriorityLabels: Record<ProjectPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const projectComplexityLabels: Record<ProjectComplexity, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  EXTREME: "Extrema",
};

export const sprintStatusLabels: Record<SprintStatus, string> = {
  PLANNED: "Planejada",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  REVIEW: "Em revisão",
  DONE: "Concluída",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const taskTypeLabels: Record<TaskType, string> = {
  FEATURE: "Feature",
  BUG: "Bug",
  RESEARCH: "Pesquisa",
  DOCUMENTATION: "Documentação",
  MEETING: "Alinhamento",
};

export const projectVisibilityLabels: Record<ProjectVisibility, string> = {
  WORKSPACE: "Workspace",
  PROJECT_MEMBERS: "Membros do projeto",
  LEADERS_ONLY: "Lideranças",
};

export const taskVisibilityLabels: Record<TaskVisibility, string> = {
  PROJECT: "Projeto",
  ASSIGNEES: "Atribuídos",
  LEADERS_ONLY: "Lideranças",
};

export const flowchartScopeLabels: Record<FlowchartScopeType, string> = {
  WORKSPACE: "Diagrama solto",
  PROJECT: "Diagrama do projeto",
  TASK: "Diagrama da tarefa",
};
