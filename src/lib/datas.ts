// O servidor da Vercel roda em UTC; as datas sempre sao exibidas no horario de Brasilia.
const FUSO_HORARIO = "America/Sao_Paulo";

// Timestamp ISO (ex.: created_at) -> "dd/mm/aaaa, hh:mm" no horario de Brasilia.
export function formatarData(dataIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: FUSO_HORARIO,
  }).format(new Date(dataIso));
}

// Data sem horario ("aaaa-mm-dd") -> "dd/mm/aaaa", sem passar por Date para nao mudar de dia.
export function formatarDataCurta(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}
