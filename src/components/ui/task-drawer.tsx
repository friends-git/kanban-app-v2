"use client";

import { Drawer } from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TaskDetailContent,
  type TaskDetailData,
} from "@/components/tasks/task-detail-content";

type TaskDrawerProps = {
  task: TaskDetailData | null;
  projects: Array<{
    id: string;
    name: string;
    sprints: Array<{
      id: string;
      name: string;
    }>;
  }>;
  users: Array<{
    id: string;
    name: string;
    avatarColor?: string | null;
  }>;
  canManage: boolean;
  canComment: boolean;
};

export function TaskDrawer({
  task,
  projects,
  users,
  canManage,
  canComment,
}: TaskDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("taskId");
    const nextQuery = params.toString();

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  return (
    <Drawer anchor="right" open={Boolean(task)} onClose={handleClose}>
      {task ? (
        <TaskDetailContent
          task={task}
          projects={projects}
          users={users}
          canManage={canManage}
          canComment={canComment}
          onClose={handleClose}
        />
      ) : null}
    </Drawer>
  );
}
