import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Sem data";
  }

  return format(new Date(value), "dd MMM", { locale: ptBR });
}

export function formatFullDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Sem data";
  }

  return format(new Date(value), "dd 'de' MMMM", { locale: ptBR });
}

export function formatRelativeDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Sem prazo";
  }

  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: ptBR,
  });
}

export function formatDateInput(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  return format(new Date(value), "yyyy-MM-dd");
}
