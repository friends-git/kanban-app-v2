import "server-only";
import {
  GlobalRole,
  ProjectRole,
  ProjectVisibility,
  TaskVisibility,
} from "@prisma/client";

type Viewer = {
  id: string;
  role: GlobalRole;
};

type ProjectMemberShape = {
  userId: string;
  role: ProjectRole;
};

type ProjectAccessShape = {
  visibility: ProjectVisibility;
  ownerId: string;
  members: ProjectMemberShape[];
};

type TaskAccessShape = {
  creatorId: string;
  visibility: TaskVisibility;
  assignees: Array<{ userId: string }>;
  project: ProjectAccessShape;
};

export function isAdmin(user: Viewer) {
  return user.role === GlobalRole.ADMIN;
}

export function isReadOnlyRole(user: Viewer) {
  return user.role === GlobalRole.ADVISOR;
}

export function canAccessAdmin(user: Viewer) {
  return isAdmin(user);
}

export function canCreateProject(user: Viewer) {
  return isAdmin(user) || user.role === GlobalRole.MEMBER;
}

export function canCreateTeam(user: Viewer) {
  return isAdmin(user) || user.role === GlobalRole.MEMBER;
}

export function canReadProject(user: Viewer, project: ProjectAccessShape) {
  if (isAdmin(user)) {
    return true;
  }

  const membership = project.members.find((member) => member.userId === user.id);
  const isLeader =
    membership?.role === ProjectRole.PROJECT_MANAGER || project.ownerId === user.id;

  if (user.role === GlobalRole.COLLABORATOR) {
    return Boolean(membership);
  }

  switch (project.visibility) {
    case ProjectVisibility.WORKSPACE:
      return true;
    case ProjectVisibility.PROJECT_MEMBERS:
      return Boolean(membership);
    case ProjectVisibility.LEADERS_ONLY:
      return Boolean(isLeader);
    default:
      return false;
  }
}

export function canManageProject(user: Viewer, project: ProjectAccessShape) {
  if (isAdmin(user)) {
    return true;
  }

  if (isReadOnlyRole(user)) {
    return false;
  }

  const membership = project.members.find((member) => member.userId === user.id);

  return (
    project.ownerId === user.id ||
    membership?.role === ProjectRole.PROJECT_MANAGER
  );
}

export function canCreateTask(user: Viewer, project: ProjectAccessShape) {
  return !isReadOnlyRole(user) && canReadProject(user, project);
}

export function canReadTask(user: Viewer, task: TaskAccessShape) {
  if (isAdmin(user)) {
    return true;
  }

  const isAssignee = task.assignees.some((assignee) => assignee.userId === user.id);
  const canManage = canManageProject(user, task.project);

  if (user.role === GlobalRole.COLLABORATOR) {
    return isAssignee || canReadProject(user, task.project);
  }

  switch (task.visibility) {
    case TaskVisibility.PROJECT:
      return canReadProject(user, task.project);
    case TaskVisibility.ASSIGNEES:
      return isAssignee || canManage;
    case TaskVisibility.LEADERS_ONLY:
      return canManage;
    default:
      return false;
  }
}

export function canManageTask(user: Viewer, task: TaskAccessShape) {
  if (isAdmin(user)) {
    return true;
  }

  if (isReadOnlyRole(user)) {
    return false;
  }

  const isAssignee = task.assignees.some((assignee) => assignee.userId === user.id);

  return task.creatorId === user.id || isAssignee || canManageProject(user, task.project);
}

export function canCommentTask(user: Viewer, task: TaskAccessShape) {
  return !isReadOnlyRole(user) && canReadTask(user, task);
}

export function canReadWorkspaceFlowchart(user: Viewer) {
  return user.role !== GlobalRole.COLLABORATOR;
}

export function canManageWorkspaceFlowchart(user: Viewer) {
  return isAdmin(user) || user.role === GlobalRole.MEMBER;
}
