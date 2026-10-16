import { describe, expect, it } from "vitest";
import { formatarData, formatarDataCurta } from "./datas";

describe("formatarData", () => {
  it("formata data e hora no padrao brasileiro", () => {
    expect(formatarData("2026-10-16T15:45:00-03:00")).toBe("16/10/2026, 15:45");
  });

  // Regressao: fix(timezone) f6db81c. Na Vercel (UTC) os horarios saiam 3h adiantados
  // e pedidos feitos a noite apareciam no dia seguinte.
  it("regressao: exibe no horario de Brasilia mesmo com o servidor em UTC", () => {
    expect(process.env.TZ).toBe("UTC");
    expect(formatarData("2026-10-16T02:30:00Z")).toBe("15/10/2026, 23:30");
  });
});

describe("formatarDataCurta", () => {
  it("converte aaaa-mm-dd para dd/mm/aaaa sem mudar o dia", () => {
    expect(formatarDataCurta("2026-10-01")).toBe("01/10/2026");
  });

  it("devolve o valor original quando nao reconhece o formato", () => {
    expect(formatarDataCurta("amanha")).toBe("amanha");
  });
});
