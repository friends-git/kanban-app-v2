import "server-only";

import {
  GlobalRole,
  ProjectRole,
  ProjectVisibility,
  TaskVisibility,
} from "@prisma/client";
import { sanitizeFlowchartContent } from "@/lib/flowcharts";
import { db } from "@/server/db";
import {
  canManageProject,
  canManageTask,
  canReadProject,
  canReadTask,
} from "@/server/permissions";

type Viewer = {
  id: string;
  role: GlobalRole;
};

function projectAccessShape(project: {
  visibility: ProjectVisibility;
  ownerId: string;
  members: Array<{ userId: string; role: ProjectRole }>;
}) {
  return {
    visibility: project.visibility,
    ownerId: project.ownerId,
    members: project.members,
  };
}

function taskAccessShape(task: {
  creatorId: string;
  visibility: TaskVisibility;
  assignees: Array<{ userId: string }>;
  project: {
    visibility: ProjectVisibility;
    ownerId: string;
    members: Array<{ userId: string; role: ProjectRole }>;
  };
}) {
  return {
    creatorId: task.creatorId,
    visibility: task.visibility,
    assignees: task.assignees,
    project: projectAccessShape(task.project),
  };
}

export async function getFlowchartDetail(flowchartId: string, user: Viewer) {
  const flowchart = await db.flowchart.findUnique({
    where: {
      id: flowchartId,
      isArchived: false,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
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
      task: {
        select: {
          id: true,
          code: true,
          title: true,
          creatorId: true,
          visibility: true,
          assignees: {
            select: {
              userId: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
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
        },
      },
    },
  });

  if (!flowchart) {
    return null;
  }

  const canRead =
    flowchart.task
      ? canReadTask(user, taskAccessShape(flowchart.task))
      : flowchart.project
        ? canReadProject(user, projectAccessShape(flowchart.project))
        : false;

  if (!canRead) {
    return null;
  }

  const canManage =
    flowchart.task
      ? canManageTask(user, taskAccessShape(flowchart.task))
      : flowchart.project
        ? canManageProject(user, projectAccessShape(flowchart.project))
        : false;

  const project = flowchart.task?.project ?? flowchart.project;

  return {
    id: flowchart.id,
    name: flowchart.name,
    description: flowchart.description,
    type: flowchart.type,
    scopeType: flowchart.scopeType,
    updatedAt: flowchart.updatedAt,
    createdAt: flowchart.createdAt,
    createdBy: flowchart.createdBy,
    canManage,
    content: sanitizeFlowchartContent(flowchart.contentJson),
    project: project
      ? {
          id: project.id,
          name: project.name,
        }
      : null,
    task: flowchart.task
      ? {
          id: flowchart.task.id,
          code: flowchart.task.code,
          title: flowchart.task.title,
        }
      : null,
  };
}
