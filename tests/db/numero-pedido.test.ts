import { afterAll, describe, expect, it } from "vitest";
import {
  apagarTenant,
  bancoServico,
  criarCliente,
  criarProduto,
  lerPedido,
  novoTenant,
  registrarPedido,
} from "./helpers";

const db = bancoServico();
const tenants: string[] = [];

afterAll(async () => {
  for (const tenant of tenants) await apagarTenant(db, tenant);
});

// Cada teste usa um tenant novo, porque a numeracao depende dos pedidos ja existentes.
async function preparar() {
  const tenant = novoTenant();
  tenants.push(tenant);
  const clienteId = await criarCliente(db, tenant);
  const produtoId = await criarProduto(db, tenant, { nome: "Empadão de Frango 350g", preco: 10 });
  return { tenant, clienteId, produtoId };
}

// Insere direto na tabela para controlar created_at; o numero vem do trigger.
async function pedidoEm(tenant: string, clienteId: string, createdAt: string) {
  const { data, error } = await db
    .from("pedidos")
    .insert({ tenant_id: tenant, cliente_id: clienteId, created_at: createdAt })
    .select("numero")
    .single();
  if (error) throw new Error(error.message);
  return data.numero as number;
}

// Regressao: feat(pedidos) cd8dd3a. Numeracao sequencial do pedido dentro do mes, por conta.
describe("numero do pedido", () => {
  it("numera em sequencia dentro do mes", async () => {
    const { tenant, clienteId, produtoId } = await preparar();
    const numeros = [];
    for (let i = 0; i < 3; i++) {
      const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: produtoId, quantidade: 1 }]);
      numeros.push((await lerPedido(db, pedidoId))?.numero);
    }

    expect(numeros).toEqual([1, 2, 3]);
  });

  it("cada conta tem a sua numeracao", async () => {
    const a = await preparar();
    const b = await preparar();

    await registrarPedido(db, a.tenant, a.clienteId, [{ produto_id: a.produtoId, quantidade: 1 }]);
    await registrarPedido(db, a.tenant, a.clienteId, [{ produto_id: a.produtoId, quantidade: 1 }]);
    const pedidoB = await registrarPedido(db, b.tenant, b.clienteId, [{ produto_id: b.produtoId, quantidade: 1 }]);

    expect((await lerPedido(db, pedidoB))?.numero).toBe(1);
  });

  it("reinicia no mes seguinte, contando o mes no horario de Brasilia", async () => {
    const { tenant, clienteId } = await preparar();

    expect(await pedidoEm(tenant, clienteId, "2025-08-31T20:00:00-03:00")).toBe(1);
    // 02:30 UTC de 01/09 ainda e 31/08 23:30 em Brasilia: continua em agosto.
    expect(await pedidoEm(tenant, clienteId, "2025-09-01T02:30:00Z")).toBe(2);
    // 03:30 UTC de 01/09 e 01/09 00:30 em Brasilia: setembro comeca do 1.
    expect(await pedidoEm(tenant, clienteId, "2025-09-01T03:30:00Z")).toBe(1);
    expect(await pedidoEm(tenant, clienteId, "2025-09-15T12:00:00-03:00")).toBe(2);
  });

  it("pedidos criados ao mesmo tempo nao repetem numero", async () => {
    const { tenant, clienteId, produtoId } = await preparar();

    const pedidos = await Promise.all(
      Array.from({ length: 5 }, () =>
        registrarPedido(db, tenant, clienteId, [{ produto_id: produtoId, quantidade: 1 }]),
      ),
    );
    const numeros = await Promise.all(pedidos.map(async (id) => (await lerPedido(db, id))?.numero));

    expect([...numeros].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
