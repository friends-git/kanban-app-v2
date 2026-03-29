export const primaryNavigation = [
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/projects", label: "Projetos", key: "projects" },
  { href: "/tasks", label: "Tarefas", key: "tasks" },
  { href: "/teams", label: "Equipes", key: "teams" },
  { href: "/sprints", label: "Sprints", key: "sprints" },
  { href: "/calendar", label: "Calendário", key: "calendar" },
] as const;

export const adminNavigation = {
  href: "/admin",
  label: "Admin",
  key: "admin",
} as const;
