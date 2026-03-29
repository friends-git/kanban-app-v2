import { Chip } from "@mui/material";
import { taskPriorityLabels } from "@/lib/domain";

const colors = {
  LOW: "default",
  MEDIUM: "secondary",
  HIGH: "warning",
  URGENT: "error",
} as const;

type PriorityBadgeProps = {
  priority: keyof typeof taskPriorityLabels;
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <Chip
      label={taskPriorityLabels[priority]}
      color={colors[priority]}
      size="small"
      variant={priority === "LOW" ? "outlined" : "filled"}
    />
  );
}
