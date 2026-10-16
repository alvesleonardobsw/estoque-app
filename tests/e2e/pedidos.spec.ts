import { expect, test, type Page } from "@playwright/test";
import { apagarTenant, bancoServico, criarCliente, criarProduto } from "../db/helpers";

const db = bancoServico();
const tenant = process.env.E2E_TENANT!;

let clienteId: string;
let frangoId: string;
let carneId: string;

test.beforeAll(async () => {
  clienteId = await criarCliente(db, tenant, "Cliente E2E");
  frangoId = await criarProduto(db, tenant, { nome: "Empadão de Frango E2E 350g", preco: 20, estoque: 2 });
  carneId = await criarProduto(db, tenant, { nome: "Empadão de Carne E2E 350g", preco: 25, estoque: 10 });
});

test.afterAll(async () => {
  await apagarTenant(db, tenant);
});

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Login").fill(process.env.E2E_USUARIO!);
  await page.getByLabel("Senha").fill(process.env.E2E_SENHA!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// O nome acessivel dos <select> inclui a opcao escolhida, entao localiza pelo rotulo em volta.
function campo(page: Page, rotulo: string) {
  return page.locator("label").filter({ hasText: new RegExp(`^${rotulo}`) }).locator("select");
}

const cliente = (page: Page) => page.locator('select[name="cliente_id"]');

async function preencherItem(page: Page, sabor: string, produtoId: string, quantidade = 1) {
  await campo(page, "Sabor").first().selectOption(sabor);
  await campo(page, "Produto").first().selectOption(produtoId);
  for (let i = 1; i < quantidade; i++) {
    await page.getByRole("button", { name: "Aumentar quantidade" }).first().click();
  }
}

async function contarPedidos() {
  const { data, error } = await db
    .from("pedidos")
    .select("id, pedido_itens(produto_id, quantidade)")
    .eq("tenant_id", tenant)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data;
}

test("sem login, as paginas mandam para o login", async ({ page }) => {
  await page.goto("/pedidos");
  await expect(page).toHaveURL(/\/login/);
});

// Regressao: fix(pedidos) 4b25f92. Depois de criar um pedido, a tela parecia limpa, mas os
// itens ficavam no estado: escolhendo so o cliente e salvando, o pedido anterior era repetido.
test("regressao: depois de criar um pedido, os itens anteriores nao vao junto no proximo", async ({
  page,
}) => {
  await entrar(page);
  await page.goto("/pedidos?novo=1");

  await cliente(page).selectOption(clienteId);
  await preencherItem(page, "carne", carneId, 2);
  await page.getByRole("button", { name: "Criar pedido" }).click();
  await expect(page.getByText("Pedido salvo com sucesso.")).toBeVisible();

  await expect(cliente(page)).toHaveValue("");
  await expect(campo(page, "Produto")).toHaveCount(1);
  await expect(campo(page, "Produto").first()).toHaveValue("");
  await expect(page.getByText("Total estimado:")).toContainText("R$ 0,00");

  await cliente(page).selectOption(clienteId);
  await page.getByRole("button", { name: "Criar pedido" }).click();
  await expect(page.getByText("Adicione pelo menos um item ao pedido.")).toBeVisible();

  const pedidos = await contarPedidos();
  expect(pedidos.map((pedido) => pedido.pedido_itens)).toEqual([[{ produto_id: carneId, quantidade: 2 }]]);
});

test("avisa quando falta estoque, mas deixa salvar, e a lista mostra o que falta produzir", async ({
  page,
}) => {
  await entrar(page);
  await page.goto("/pedidos?novo=1");

  await cliente(page).selectOption(clienteId);
  await preencherItem(page, "frango", frangoId, 2);
  await expect(page.getByText("So tem")).toHaveCount(0);

  await page.getByRole("button", { name: "Aumentar quantidade" }).first().click();
  await expect(page.getByText("So tem 2 em estoque. Faltam 1.")).toBeVisible();
  await expect(page.getByText("O pedido pode ser salvo mesmo assim")).toBeVisible();

  await page.getByRole("button", { name: "Criar pedido" }).click();
  await expect(page.getByText("Pedido salvo com sucesso.")).toBeVisible();

  await page.goto("/pedidos");
  await expect(page.getByText("Falta estoque para os pedidos pendentes")).toBeVisible();
  await expect(
    page.getByText("Sem estoque para entregar: Empadão de Frango E2E 350g (faltam 1)"),
  ).toBeVisible();
});
