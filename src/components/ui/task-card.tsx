import { Box, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChip } from "@/components/ui/tag-chip";
import { formatDate } from "@/lib/formatters";

type TaskCardProps = {
  task: {
    id: string;
    code: string;
    title: string;
    summary: string | null;
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate: Date | null;
    assignees: Array<{
      user: {
        id: string;
        name: string;
        avatarColor: string | null;
      };
    }>;
    tags?: Array<{
      tag: {
        id: string;
        name: string;
        color: string;
      };
    }>;
  };
  href?: string;
  contextLabel?: string;
};

export function TaskCard({ task, href, contextLabel }: TaskCardProps) {
  const content = (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" spacing={1.5}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="overline"
            noWrap
            sx={{ color: "text.secondary", letterSpacing: "0.08em" }}
          >
            {contextLabel ? `${contextLabel} • ${task.code}` : task.code}
          </Typography>
          <Typography fontWeight={800} sx={{ lineHeight: 1.2 }}>
            {task.title}
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{
              mt: 0.35,
              display: "-webkit-box",
              overflow: "hidden",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.summary ?? "Sem resumo"}
          </Typography>
        </Box>
        <StatusBadge status={task.status} />
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <PriorityBadge priority={task.priority} />
        {task.tags?.slice(0, 2).map((tagItem) => (
          <TagChip
            key={tagItem.tag.id}
            label={tagItem.tag.name}
            color={tagItem.tag.color}
          />
        ))}
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography color="text.secondary" variant="body2">
          Prazo {formatDate(task.dueDate)}
        </Typography>
        <AvatarStack
          max={3}
          items={task.assignees.map((assignee) => ({
            id: assignee.user.id,
            name: assignee.user.name,
            avatarColor: assignee.user.avatarColor,
          }))}
        />
      </Stack>
    </Stack>
  );

  return (
    <Box
      sx={{
        display: "block",
        p: 2.25,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        textDecoration: "none",
        transition: "transform 180ms ease, border-color 180ms ease, background-color 180ms ease",
        "&:hover": {
          borderColor: "rgba(93, 5, 255, 0.22)",
          bgcolor: "action.hover",
          transform: "translateY(-1px)",
        },
      }}
    >
      {href ? (
        <Box
          component={Link}
          href={href}
          sx={{ display: "block", color: "inherit", textDecoration: "none" }}
        >
          {content}
        </Box>
      ) : (
        content
      )}
    </Box>
  );
}
