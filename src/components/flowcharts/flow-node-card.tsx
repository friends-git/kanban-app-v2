"use client";

import { Box, Chip, Stack, Typography, alpha, useTheme, type Theme } from "@mui/material";
import { TaskStatus } from "@prisma/client";
import {
  type FlowLaneOrientation,
  type FlowNodeColorKey,
  type FlowNodeType,
  type FlowchartNodeSize,
} from "@/lib/flowcharts";
import { taskStatusLabels } from "@/lib/domain";
import { brandColors } from "@/lib/theme";

type FlowNodeCardProps =
  | {
      variant: "manual";
      type: FlowNodeType;
      color: FlowNodeColorKey;
      label: string;
      size: FlowchartNodeSize;
      orientation?: FlowLaneOrientation;
      selected?: boolean;
      pendingConnection?: boolean;
    }
  | {
      variant: "task";
      label: string;
      code: string;
      status: TaskStatus;
      blocked: boolean;
      sprintName: string | null;
      isCurrentSprint?: boolean;
      assigneeNames: string[];
      highlighted?: boolean;
      selected?: boolean;
    };

export function FlowNodeCard(props: FlowNodeCardProps) {
  const theme = useTheme();

  if (props.variant === "task") {
    const statusColor = getTaskStatusColor(props.status);

    return (
      <Box
        sx={{
          width: 304,
          minHeight: 160,
          borderRadius: 5,
          border: "1px solid",
          borderColor: props.selected ? "secondary.main" : "divider",
          bgcolor: alpha(theme.palette.background.paper, props.highlighted ? 0.98 : 0.94),
          boxShadow: props.selected
            ? "0 26px 56px rgba(93, 5, 255, 0.18)"
            : props.highlighted
              ? "0 24px 48px rgba(255, 187, 0, 0.12)"
              : "0 18px 40px rgba(7, 6, 12, 0.14)",
          p: 2,
          backdropFilter: "blur(18px)",
        }}
      >
        <Stack spacing={1.15}>
          <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
            <Typography
              variant="overline"
              sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
            >
              {props.code}
            </Typography>
            <Chip
              label={taskStatusLabels[props.status]}
              size="small"
              sx={{
                bgcolor: alpha(statusColor, 0.16),
                color: statusColor,
                fontWeight: 700,
              }}
            />
          </Stack>

          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 16,
              lineHeight: 1.22,
              letterSpacing: "-0.03em",
              whiteSpace: "pre-wrap",
            }}
          >
            {props.label}
          </Typography>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {props.blocked ? (
              <Chip
                label="Bloqueada"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.warning.main, 0.16),
                  color: "warning.main",
                  fontWeight: 700,
                }}
              />
            ) : null}
            {props.sprintName ? (
              <Chip
                label={props.isCurrentSprint ? `Sprint atual · ${props.sprintName}` : props.sprintName}
                size="small"
                sx={{
                  bgcolor: props.isCurrentSprint
                    ? alpha(brandColors.gold, 0.14)
                    : alpha(brandColors.violet, 0.12),
                  color: props.isCurrentSprint ? "primary.main" : "secondary.main",
                  fontWeight: 700,
                }}
              />
            ) : null}
          </Stack>

          <Typography color="text.secondary" variant="body2">
            {props.assigneeNames.length
              ? props.assigneeNames.join(", ")
              : "Sem responsaveis definidos"}
          </Typography>
        </Stack>
      </Box>
    );
  }

  const palette = getManualPalette(props.color, theme);
  const commonShadow = props.selected
    ? "0 28px 64px rgba(93, 5, 255, 0.22)"
    : props.pendingConnection
      ? "0 24px 52px rgba(255, 187, 0, 0.22)"
      : "0 18px 38px rgba(7, 6, 12, 0.12)";
  const baseBorderColor = props.selected
    ? "secondary.main"
    : props.pendingConnection
      ? "primary.main"
      : palette.border;

  if (props.type === "SWIMLANE") {
    const isVertical = props.orientation !== "HORIZONTAL";

    return (
      <Box
        sx={{
          width: props.size.width,
          height: props.size.height,
          borderRadius: 6,
          border: "1px dashed",
          borderColor: baseBorderColor,
          bgcolor: alpha(theme.palette.background.paper, 0.52),
          boxShadow: props.selected ? commonShadow : "none",
          position: "relative",
          overflow: "hidden",
          backdropFilter: "blur(12px)",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(93, 5, 255, 0.08), transparent 22%), linear-gradient(90deg, rgba(255, 187, 0, 0.06), transparent 42%)",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: isVertical ? 14 : 0,
            left: isVertical ? 14 : 0,
            right: isVertical ? 14 : undefined,
            width: isVertical ? undefined : "100%",
            height: isVertical ? 38 : 48,
            px: isVertical ? 1.35 : 2,
            display: "flex",
            alignItems: "center",
            justifyContent: isVertical ? "flex-start" : "space-between",
            borderRadius: isVertical ? 999 : 0,
            bgcolor: alpha(brandColors.violet, 0.12),
            borderBottom: isVertical ? "none" : "1px solid",
            borderColor: alpha(brandColors.violet, 0.2),
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "secondary.main",
            }}
          >
            {props.label || "Nova raia"}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (props.type === "DECISION") {
    return (
      <Box
        sx={{
          width: props.size.width,
          height: props.size.height,
          transform: "rotate(45deg)",
          borderRadius: 4,
          border: "1px solid",
          borderColor: baseBorderColor,
          bgcolor: palette.background,
          boxShadow: commonShadow,
          display: "grid",
          placeItems: "center",
          px: 2,
        }}
      >
        <NodeLabel
          text={props.label || "Decisao"}
          color={palette.text}
          sx={{
            maxWidth: props.size.width * 0.6,
            transform: "rotate(-45deg)",
            textAlign: "center",
          }}
        />
      </Box>
    );
  }

  if (props.type === "DATA_IO") {
    return (
      <Box
        sx={{
          width: props.size.width,
          height: props.size.height,
          transform: "skewX(-18deg)",
          borderRadius: 4,
          border: "1px solid",
          borderColor: baseBorderColor,
          bgcolor: palette.background,
          boxShadow: commonShadow,
          display: "grid",
          placeItems: "center",
          px: 2.5,
        }}
      >
        <NodeLabel
          text={props.label || "Entrada/Saida"}
          color={palette.text}
          sx={{
            transform: "skewX(18deg)",
            textAlign: "center",
          }}
        />
      </Box>
    );
  }

  if (props.type === "MANUAL_OPERATION") {
    return (
      <Box
        sx={{
          width: props.size.width,
          height: props.size.height,
          clipPath: "polygon(9% 0%, 91% 0%, 100% 100%, 0% 100%)",
          border: "1px solid",
          borderColor: baseBorderColor,
          bgcolor: palette.background,
          boxShadow: commonShadow,
          display: "grid",
          placeItems: "center",
          px: 3,
        }}
      >
        <NodeLabel text={props.label || "Operacao manual"} color={palette.text} />
      </Box>
    );
  }

  if (props.type === "CONNECTOR") {
    return (
      <Box
        sx={{
          width: props.size.width,
          height: props.size.height,
          borderRadius: "50%",
          border: "1px solid",
          borderColor: baseBorderColor,
          bgcolor: palette.background,
          boxShadow: commonShadow,
          display: "grid",
          placeItems: "center",
          px: 1.25,
        }}
      >
        <NodeLabel
          text={props.label || "C"}
          color={palette.text}
          sx={{ fontSize: 13.5, textAlign: "center" }}
        />
      </Box>
    );
  }

  if (props.type === "TEXT") {
    return (
      <Box
        sx={{
          width: props.size.width,
          minHeight: props.size.height,
          px: 0.6,
          py: 0.35,
        }}
      >
        <Typography
          sx={{
            color: props.selected ? "secondary.main" : palette.text,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.35,
            letterSpacing: "-0.03em",
            whiteSpace: "pre-wrap",
          }}
        >
          {props.label || "Texto"}
        </Typography>
      </Box>
    );
  }

  if (props.type === "START_END") {
    return (
      <BaseManualNode
        width={props.size.width}
        minHeight={props.size.height}
        borderColor={baseBorderColor}
        background={palette.background}
        color={palette.text}
        boxShadow={commonShadow}
        borderRadius={999}
        paddingX={2.2}
        paddingY={1.6}
      >
        <NodeLabel text={props.label || "Inicio/Fim"} color={palette.text} align="center" />
      </BaseManualNode>
    );
  }

  if (props.type === "SUBPROCESS") {
    return (
      <BaseManualNode
        width={props.size.width}
        minHeight={props.size.height}
        borderColor={baseBorderColor}
        background={palette.background}
        color={palette.text}
        boxShadow={commonShadow}
        borderRadius={5}
        paddingX={2}
        paddingY={1.75}
      >
        <Box
          sx={{
            position: "absolute",
            inset: "14px auto 14px 12px",
            width: 2,
            bgcolor: alpha(palette.text, 0.24),
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: "14px 12px 14px auto",
            width: 2,
            bgcolor: alpha(palette.text, 0.24),
          }}
        />
        <NodeLabel text={props.label || "Subprocesso"} color={palette.text} />
      </BaseManualNode>
    );
  }

  if (props.type === "DOCUMENT") {
    return (
      <BaseManualNode
        width={props.size.width}
        minHeight={props.size.height}
        borderColor={baseBorderColor}
        background={palette.background}
        color={palette.text}
        boxShadow={commonShadow}
        borderRadius={5}
        paddingX={2}
        paddingY={1.75}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: 24,
            background: palette.background,
            clipPath:
              "polygon(0 35%, 12% 12%, 24% 35%, 36% 12%, 48% 35%, 60% 12%, 72% 35%, 84% 12%, 100% 35%, 100% 100%, 0 100%)",
            borderTop: "1px solid",
            borderColor: alpha(palette.border, 0.8),
          }}
        />
        <NodeLabel text={props.label || "Documento"} color={palette.text} />
      </BaseManualNode>
    );
  }

  if (props.type === "NOTE") {
    return (
      <BaseManualNode
        width={props.size.width}
        minHeight={props.size.height}
        borderColor={baseBorderColor}
        background={palette.background}
        color={palette.text}
        boxShadow={commonShadow}
        borderRadius={4.5}
        paddingX={2}
        paddingY={2.2}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 24,
            height: 24,
            background: alpha("#ffffff", 0.28),
            clipPath: "polygon(0 0, 100% 0, 100% 100%)",
          }}
        />
        <NodeLabel text={props.label || "Nova nota"} color={palette.text} weight={700} />
      </BaseManualNode>
    );
  }

  return (
    <BaseManualNode
      width={props.size.width}
      minHeight={props.size.height}
      borderColor={baseBorderColor}
      background={palette.background}
      color={palette.text}
      boxShadow={commonShadow}
      borderRadius={5}
      paddingX={2}
      paddingY={1.75}
    >
      <NodeLabel text={props.label || "Processo"} color={palette.text} />
    </BaseManualNode>
  );
}

function BaseManualNode({
  width,
  minHeight,
  borderColor,
  background,
  color,
  boxShadow,
  borderRadius,
  paddingX,
  paddingY,
  children,
}: {
  width: number;
  minHeight: number;
  borderColor: string;
  background: string;
  color: string;
  boxShadow: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        width,
        minHeight,
        borderRadius,
        border: "1px solid",
        borderColor,
        bgcolor: background,
        color,
        boxShadow,
        position: "relative",
        px: paddingX,
        py: paddingY,
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
}

function NodeLabel({
  text,
  color,
  align = "left",
  weight = 800,
  sx,
}: {
  text: string;
  color: string;
  align?: "left" | "center";
  weight?: number;
  sx?: Record<string, unknown>;
}) {
  return (
    <Typography
      sx={{
        position: "relative",
        zIndex: 1,
        fontWeight: weight,
        fontSize: 15,
        lineHeight: 1.34,
        letterSpacing: "-0.02em",
        color,
        textAlign: align,
        whiteSpace: "pre-wrap",
        ...sx,
      }}
    >
      {text}
    </Typography>
  );
}

function getTaskStatusColor(status: TaskStatus) {
  switch (status) {
    case TaskStatus.TODO:
      return brandColors.violet;
    case TaskStatus.IN_PROGRESS:
      return brandColors.gold;
    case TaskStatus.DONE:
      return "#18B56A";
    case TaskStatus.REVIEW:
      return "#8A54FF";
    case TaskStatus.BACKLOG:
    default:
      return "#8C839F";
  }
}

function getManualPalette(color: FlowNodeColorKey, theme: Theme) {
  switch (color) {
    case "gold":
      return {
        background: alpha(brandColors.gold, 0.22),
        border: alpha(brandColors.gold, 0.42),
        text: theme.palette.text.primary,
      };
    case "violet":
      return {
        background: alpha(brandColors.violet, 0.18),
        border: alpha(brandColors.violet, 0.34),
        text: theme.palette.text.primary,
      };
    case "mint":
      return {
        background: alpha("#18B56A", 0.16),
        border: alpha("#18B56A", 0.3),
        text: theme.palette.text.primary,
      };
    case "rose":
      return {
        background: alpha("#F45EA4", 0.16),
        border: alpha("#F45EA4", 0.3),
        text: theme.palette.text.primary,
      };
    case "slate":
    default:
      return {
        background: alpha(theme.palette.background.paper, 0.98),
        border: alpha(theme.palette.text.secondary, 0.18),
        text: theme.palette.text.primary,
      };
  }
}
