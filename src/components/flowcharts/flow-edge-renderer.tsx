"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import {
  type FlowEdgeAccent,
  type FlowEdgeLineStyle,
  type FlowEdgeType,
} from "@/lib/flowcharts";
import { brandColors } from "@/lib/theme";

export type FlowEdgeData = {
  label?: string;
  highlighted?: boolean;
  muted?: boolean;
  connectionType?: FlowEdgeType;
  accent?: FlowEdgeAccent;
  lineStyle?: FlowEdgeLineStyle;
  offsetIndex?: number;
  editable?: boolean;
};

export function FlowEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerStart,
  markerEnd,
  data,
}: EdgeProps) {
  const theme = useTheme();
  const edgeData = (data ?? {}) as FlowEdgeData;
  const offsetIndex = edgeData.offsetIndex ?? 0;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: sourcePosition ?? Position.Right,
    targetPosition: targetPosition ?? Position.Left,
    borderRadius: 22 + Math.abs(offsetIndex) * 6,
    offset: 26 + Math.abs(offsetIndex) * 10,
  });

  const accent =
    edgeData.accent === "gold"
      ? brandColors.gold
      : edgeData.accent === "violet"
        ? brandColors.violet
        : theme.palette.text.secondary;

  const stroke =
    selected || edgeData.highlighted
      ? accent
      : edgeData.muted
        ? alpha(theme.palette.text.secondary, 0.18)
        : alpha(accent, 0.6);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        interactionWidth={30}
        style={{
          stroke,
          strokeWidth: selected || edgeData.highlighted ? 2.8 : 2.05,
          strokeDasharray: edgeData.lineStyle === "dashed" ? "8 6" : undefined,
          filter:
            selected || edgeData.highlighted
              ? "drop-shadow(0 0 10px rgba(93, 5, 255, 0.18))"
              : "none",
        }}
      />

      {selected && edgeData.editable ? (
        <EdgeLabelRenderer>
          <>
            <Box
              sx={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${sourceX}px, ${sourceY}px)`,
                pointerEvents: "none",
                zIndex: 7,
              }}
            >
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  border: "2px solid",
                  borderColor: alpha(accent, 0.88),
                  bgcolor: alpha(theme.palette.background.paper, 0.96),
                  boxShadow: "0 0 0 4px rgba(255, 187, 0, 0.14)",
                }}
              />
            </Box>
            <Box
              sx={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${targetX}px, ${targetY}px)`,
                pointerEvents: "none",
                zIndex: 7,
              }}
            >
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  border: "2px solid",
                  borderColor: alpha(accent, 0.88),
                  bgcolor: alpha(theme.palette.background.paper, 0.96),
                  boxShadow: "0 0 0 4px rgba(93, 5, 255, 0.12)",
                }}
              />
            </Box>
          </>
        </EdgeLabelRenderer>
      ) : null}

      {edgeData.label ? (
        <EdgeLabelRenderer>
          <Box
            sx={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + offsetIndex * 14}px)`,
              pointerEvents: "none",
              zIndex: 6,
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 999,
                border: "1px solid",
                borderColor: selected ? alpha(accent, 0.54) : "divider",
                bgcolor: alpha(theme.palette.background.paper, 0.94),
                backdropFilter: "blur(12px)",
                boxShadow: selected
                  ? "0 16px 28px rgba(93, 5, 255, 0.18)"
                  : "0 8px 18px rgba(7, 6, 12, 0.1)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: selected ? accent : "text.secondary",
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                }}
              >
                {edgeData.label}
              </Typography>
            </Box>
          </Box>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
