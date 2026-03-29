import "server-only";
import { startOfDay } from "date-fns";
import { Prisma, TaskStatus } from "@prisma/client";
import { roleLabels, taskStatusLabels } from "@/lib/domain";
import { db } from "@/server/db";
import { canAccessAdmin, canReadProject, canReadTask } from "@/server/permissions";

type Viewer = {
  id: string;
  role: Parameters<typeof canAccessAdmin>[0]["role"];
};

const projectListInclude = Prisma.validator<Prisma.ProjectInclude>()({
  team: true,
  owner: true,
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarColor: true,
          title: true,
        },
      },
    },
  },
  _count: {
    select: {
      tasks: true,
      sprints: true,
      members: true,
    },
  },
});

const taskInclude = Prisma.validator<Prisma.TaskInclude>()({
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      visibility: true,
      ownerId: true,
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  },
  sprint: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  assignees: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
          role: true,
        },
      },
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
  checklistItems: {
    orderBy: {
      position: "asc",
    },
  },
  comments: {
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
});

const sprintInclude = Prisma.validator<Prisma.SprintInclude>()({
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      visibility: true,
      ownerId: true,
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  },
  tasks: {
    include: {
      assignees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarColor: true,
            },
          },
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  },
});

const teamInclude = Prisma.validator<Prisma.TeamInclude>()({
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          title: true,
          avatarColor: true,
        },
      },
    },
  },
  projects: {
    include: {
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  },
});

const projectDetailInclude = Prisma.validator<Prisma.ProjectInclude>()({
  team: true,
  owner: true,
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarColor: true,
          title: true,
        },
      },
    },
  },
  sprints: {
    orderBy: {
      startDate: "asc",
    },
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  },
  tasks: {
    include: taskInclude,
    orderBy: [
      {
        status: "asc",
      },
      {
        dueDate: "asc",
      },
    ],
  },
  board: {
    include: {
      columns: {
        orderBy: {
          position: "asc",
        },
        include: {
          tasks: {
            include: taskInclude,
            orderBy: [
              {
                dueDate: "asc",
              },
              {
                createdAt: "desc",
              },
            ],
          },
        },
      },
    },
  },
});

type ProjectListRecord = Prisma.ProjectGetPayload<{
  include: typeof projectListInclude;
}>;

type TaskRecord = Prisma.TaskGetPayload<{
  include: typeof taskInclude;
}>;

type SprintRecord = Prisma.SprintGetPayload<{
  include: typeof sprintInclude;
}>;

type TeamRecord = Prisma.TeamGetPayload<{
  include: typeof teamInclude;
}>;

type ProjectDetailRecord = Prisma.ProjectGetPayload<{
  include: typeof projectDetailInclude;
}>;

function projectAccessShape(project: {
  visibility: ProjectListRecord["visibility"];
  ownerId: string;
  members: Array<{ userId: string; role: ProjectListRecord["members"][number]["role"] }>;
}) {
  return {
    visibility: project.visibility,
    ownerId: project.ownerId,
    members: project.members.map((member) => ({
      userId: member.userId,
      role: member.role,
    })),
  };
}

function taskAccessShape(task: TaskRecord) {
  return {
    creatorId: task.creatorId,
    visibility: task.visibility,
    assignees: task.assignees.map((assignee) => ({
      userId: assignee.userId,
    })),
    project: projectAccessShape(task.project),
  };
}

function sprintTaskAccessShape(
  task: SprintRecord["tasks"][number],
  project: SprintRecord["project"],
) {
  return {
    creatorId: task.creatorId,
    visibility: task.visibility,
    assignees: task.assignees.map((assignee) => ({
      userId: assignee.userId,
    })),
    project: projectAccessShape(project),
  };
}

function canSeeProject(user: Viewer, project: ProjectListRecord | ProjectDetailRecord) {
  return canReadProject(user, projectAccessShape(project));
}

function canSeeTask(user: Viewer, task: TaskRecord) {
  return canReadTask(user, taskAccessShape(task));
}

export async function listVisibleProjects(user: Viewer) {
  const projects = await db.project.findMany({
    include: projectListInclude,
    orderBy: [
      {
        status: "asc",
      },
      {
        dueDate: "asc",
      },
    ],
  });

  return projects.filter((project) => canSeeProject(user, project));
}

export async function listVisibleTasks(user: Viewer) {
  const tasks = await db.task.findMany({
    include: taskInclude,
    orderBy: [
      {
        dueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return tasks.filter((task) => canSeeTask(user, task));
}

export async function listVisibleSprints(user: Viewer) {
  const sprints = await db.sprint.findMany({
    include: sprintInclude,
    orderBy: [
      {
        status: "asc",
      },
      {
        startDate: "asc",
      },
    ],
  });

  return sprints
    .filter((sprint) => canReadProject(user, projectAccessShape(sprint.project)))
    .map((sprint) => ({
      ...sprint,
      tasks: sprint.tasks.filter((task) =>
        canReadTask(user, sprintTaskAccessShape(task, sprint.project)),
      ),
    }));
}

export async function listVisibleTeams(user: Viewer) {
  const teams = await db.team.findMany({
    include: teamInclude,
    orderBy: {
      name: "asc",
    },
  });

  return teams.filter((team) => {
    if (user.role !== "COLLABORATOR") {
      return true;
    }

    const isMember = team.members.some((member) => member.userId === user.id);
    const hasVisibleProject = team.projects.some((project) =>
      canReadProject(user, projectAccessShape(project)),
    );

    return isMember || hasVisibleProject;
  });
}

export async function getProjectDetail(projectId: string, user: Viewer) {
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    include: projectDetailInclude,
  });

  if (!project || !canSeeProject(user, project)) {
    return null;
  }

  const visibleTasks = project.tasks.filter((task) => canSeeTask(user, task));
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));

  return {
    ...project,
    tasks: visibleTasks,
    board: project.board
      ? {
          ...project.board,
          columns: project.board.columns.map((column) => ({
            ...column,
            tasks: column.tasks.filter((task) => visibleTaskIds.has(task.id)),
          })),
        }
      : null,
  };
}

export async function getDashboardData(user: Viewer) {
  const [projects, tasks, sprints] = await Promise.all([
    listVisibleProjects(user),
    listVisibleTasks(user),
    listVisibleSprints(user),
  ]);

  const openTasks = tasks.filter((task) => task.status !== TaskStatus.DONE);
  const allMyTasks = tasks.filter((task) =>
    task.assignees.some((assignee) => assignee.userId === user.id),
  );
  const myTasks = allMyTasks.slice(0, 5);
  const activeSprints = sprints.filter((sprint) => sprint.status === "ACTIVE");
  const upcoming = tasks
    .filter((task) => task.dueDate && task.status !== TaskStatus.DONE)
    .slice(0, 6);
  const statusBreakdown = Object.values(TaskStatus).map((status) => ({
    status,
    label: taskStatusLabels[status],
    value: tasks.filter((task) => task.status === status).length,
  }));

  return {
    projects,
    tasks,
    sprints,
    stats: {
      visibleProjects: projects.length,
      openTasks: openTasks.length,
      activeSprints: activeSprints.length,
      myTasks: allMyTasks.length,
    },
    statusBreakdown,
    myTasks,
    upcoming,
  };
}

export async function getCalendarPageData(user: Viewer) {
  const [tasks, sprints] = await Promise.all([
    listVisibleTasks(user),
    listVisibleSprints(user),
  ]);

  const taskEvents = tasks
    .filter((task) => task.dueDate)
    .map((task) => ({
      id: task.id,
      date: task.dueDate!,
      title: task.title,
      projectName: task.project.name,
      type: "task" as const,
      meta: `Prazo ${task.code}`,
    }));

  const sprintEvents = sprints.flatMap((sprint) => [
    {
      id: `${sprint.id}-start`,
      date: sprint.startDate,
      title: sprint.name,
      projectName: sprint.project.name,
      type: "sprint" as const,
      meta: "Início da sprint",
    },
    {
      id: `${sprint.id}-end`,
      date: sprint.endDate,
      title: sprint.name,
      projectName: sprint.project.name,
      type: "sprint" as const,
      meta: "Término da sprint",
    },
  ]);

  const events = [...taskEvents, ...sprintEvents].sort(
    (left, right) => left.date.getTime() - right.date.getTime(),
  );
  const now = startOfDay(new Date());

  return {
    events,
    upcoming: events.filter((event) => event.date >= now).slice(0, 12),
  };
}

export async function getAdminPageData(user: Viewer) {
  if (!canAccessAdmin(user)) {
    return null;
  }

  const [users, sessionCount, projectCount, taskCount] = await Promise.all([
    db.user.findMany({
      include: {
        _count: {
          select: {
            projectMemberships: true,
            teamMemberships: true,
            taskAssignments: true,
          },
        },
      },
      orderBy: [
        {
          role: "asc",
        },
        {
          name: "asc",
        },
      ],
    }),
    db.session.count({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
    }),
    db.project.count(),
    db.task.count(),
  ]);

  const roleDistribution = Object.entries(
    users.reduce<Record<string, number>>((accumulator, currentUser) => {
      accumulator[currentUser.role] = (accumulator[currentUser.role] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).map(([role, value]) => ({
    role,
    label: roleLabels[role as keyof typeof roleLabels],
    value,
  }));

  return {
    users,
    sessionCount,
    projectCount,
    taskCount,
    roleDistribution,
  };
}
