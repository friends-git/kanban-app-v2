import { Box, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChip } from "@/components/ui/tag-chip";
import { formatDate } from "@/lib/formatters";

type ProjectCardProps = {
  project: {
    id: string;
    name: string;
    summary: string;
    status: string;
    visibility: string;
    dueDate: Date | null;
    team?: { name: string } | null;
    owner: { name: string };
    members: Array<{
      user: {
        id: string;
        name: string;
        avatarColor: string | null;
      };
    }>;
    _count: {
      tasks: number;
      sprints: number;
    };
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Box
      component={Link}
      href={`/projects/${project.id}`}
      sx={{
        display: "block",
        p: 2.25,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        color: "inherit",
        textDecoration: "none",
        transition:
          "transform 180ms ease, border-color 180ms ease, background-color 180ms ease",
        "&:hover": {
          borderColor: "rgba(93, 5, 255, 0.22)",
          bgcolor: "action.hover",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography
            variant="overline"
            noWrap
            sx={{ color: "text.secondary", letterSpacing: "0.08em" }}
          >
            {project.team?.name ?? "Grupo do TCC"}
          </Typography>
          <StatusBadge status={project.status} />
        </Stack>

        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800} sx={{ lineHeight: 1.2 }}>
            {project.name}
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{
              mt: 0.45,
              display: "-webkit-box",
              overflow: "hidden",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {project.summary}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <TagChip label={`${project._count.tasks} tarefas`} selected />
          <TagChip label={`${project._count.sprints} sprints`} />
          <StatusBadge status={project.visibility} />
        </Stack>

        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="body2">
              Responsável
            </Typography>
            <Typography fontWeight={700} variant="body2">
              {project.owner.name}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography color="text.secondary" variant="body2">
              Prazo
            </Typography>
            <Typography fontWeight={700} variant="body2">
              {formatDate(project.dueDate)}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
          <AvatarStack
            items={project.members.map((member) => ({
              id: member.user.id,
              name: member.user.name,
              avatarColor: member.user.avatarColor,
            }))}
          />
          <Typography color="text.secondary" variant="body2">
            {project.members.length} pessoas
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
