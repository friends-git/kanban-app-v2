import { GlobalRole } from "@prisma/client";

export const SEED_DEFAULT_PASSWORD =
  process.env.SEED_DEFAULT_PASSWORD ?? "tcc2026";

export const demoUsers = [
  {
    name: "Leonardo Bouzan",
    email: "leonardo@tcc.local",
    role: GlobalRole.ADMIN,
    title: "Coordenador do workspace",
    avatarColor: "#2563eb",
  },
  {
    name: "Marina Costa",
    email: "marina@tcc.local",
    role: GlobalRole.ADMIN,
    title: "Admin de produto e pesquisa",
    avatarColor: "#7c3aed",
  },
  {
    name: "Ana Luiza Rocha",
    email: "ana.rocha@tcc.local",
    role: GlobalRole.MEMBER,
    title: "Product designer",
    avatarColor: "#db2777",
  },
  {
    name: "Bruno Nascimento",
    email: "bruno@tcc.local",
    role: GlobalRole.MEMBER,
    title: "Frontend",
    avatarColor: "#0f766e",
  },
  {
    name: "Caio Mendes",
    email: "caio@tcc.local",
    role: GlobalRole.MEMBER,
    title: "Backend",
    avatarColor: "#ea580c",
  },
  {
    name: "Fernanda Lima",
    email: "fernanda@tcc.local",
    role: GlobalRole.MEMBER,
    title: "QA e operação",
    avatarColor: "#0284c7",
  },
  {
    name: "Gabriel Alves",
    email: "gabriel@tcc.local",
    role: GlobalRole.MEMBER,
    title: "Dados e dashboard",
    avatarColor: "#65a30d",
  },
  {
    name: "Rafaela Torres",
    email: "rafaela@tcc.local",
    role: GlobalRole.COLLABORATOR,
    title: "Colaboradora de calendário",
    avatarColor: "#f59e0b",
  },
  {
    name: "Prof. Helena Martins",
    email: "helena@tcc.local",
    role: GlobalRole.ADVISOR,
    title: "Orientadora",
    avatarColor: "#64748b",
  },
] as const;
