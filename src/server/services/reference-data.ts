import "server-only";

import { GlobalRole } from "@prisma/client";
import { db } from "@/server/db";
import { canReadProject } from "@/server/permissions";

type Viewer = {
  id: string;
  role: GlobalRole;
};

export async function listProjectFormOptions() {
  const [users, teams] = await Promise.all([
    db.user.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarColor: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    db.team.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    users,
    teams,
  };
}

export async function listTeamFormOptions() {
  const users = await db.user.findMany({
    where: {
      active: true,
    },
    select: {
      id: true,
      name: true,
      role: true,
      avatarColor: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    users,
  };
}

export async function listTaskFormOptions(user: Viewer) {
  const [users, projects] = await Promise.all([
    db.user.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarColor: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    db.project.findMany({
      include: {
        sprints: {
          select: {
            id: true,
            name: true,
            status: true,
            projectId: true,
          },
          orderBy: {
            startDate: "asc",
          },
        },
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    users,
    projects: projects
      .filter((project) =>
        canReadProject(user, {
          visibility: project.visibility,
          ownerId: project.ownerId,
          members: project.members,
        }),
      )
      .map((project) => ({
        id: project.id,
        name: project.name,
        sprints: project.sprints,
      })),
  };
}
