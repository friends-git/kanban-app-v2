import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { EntityCard } from "@/components/ui/entity-card";
import { PageHeader } from "@/components/ui/page-header";
import { TagChip } from "@/components/ui/tag-chip";
import { requireUser } from "@/server/auth/session";
import { getCalendarPageData } from "@/server/services/workspace";

export default async function CalendarPage() {
  const user = await requireUser();
  const { events, upcoming } = await getCalendarPageData(user);
  const currentMonth = new Date();
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { locale: ptBR }),
    end: endOfWeek(endOfMonth(currentMonth), { locale: ptBR }),
  });

  const eventsByDay = new Map<string, typeof events>();

  for (const event of events) {
    const key = format(event.date, "yyyy-MM-dd");
    const bucket = eventsByDay.get(key) ?? [];
    bucket.push(event);
    eventsByDay.set(key, bucket);
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Calendário"
        title="Agenda do workspace"
        description="Visão mensal e compacta para tarefas com prazo e marcos de sprint, sem excesso de informação."
      />

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", xl: "1.3fr 0.7fr" },
        }}
      >
        <EntityCard
          eyebrow="Mensal"
          title={format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          description="Eventos visíveis pelo seu papel atual."
        >
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            }}
          >
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <Typography key={day} color="text.secondary" variant="body2" sx={{ px: 0.5, pb: 0.5 }}>
                {day}
              </Typography>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDay.get(key) ?? [];

              return (
                <Box
                  key={key}
                  sx={{
                    minHeight: 124,
                    p: 1,
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: isSameMonth(day, currentMonth)
                      ? "background.paper"
                      : "action.hover",
                  }}
                >
                  <Typography
                    fontWeight={700}
                    color={isSameMonth(day, currentMonth) ? "text.primary" : "text.secondary"}
                    variant="body2"
                  >
                    {format(day, "d")}
                  </Typography>
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    {dayEvents.slice(0, 2).map((event) => (
                      <TagChip
                        key={event.id}
                        label={event.title}
                        selected={event.type === "task"}
                      />
                    ))}
                    {dayEvents.length > 2 ? (
                      <Typography color="text.secondary" variant="caption">
                        +{dayEvents.length - 2} itens
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </EntityCard>

        <EntityCard
          eyebrow="Próximos"
          title="Agenda imediata"
          description="Resumo compacto do que vence a seguir."
        >
          <List sx={{ p: 0 }}>
            {upcoming.map((event, index) => (
              <Box key={event.id}>
                <ListItem sx={{ px: 0, py: 1.25 }}>
                  <ListItemText
                    primary={event.title}
                    secondary={`${event.projectName} • ${event.meta} • ${format(event.date, "dd/MM", { locale: ptBR })}`}
                  />
                </ListItem>
                {index < upcoming.length - 1 ? <Divider /> : null}
              </Box>
            ))}
          </List>
        </EntityCard>
      </Box>
    </Stack>
  );
}
