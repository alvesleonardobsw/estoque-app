import { apagarTenantsDeTeste, bancoServico } from "./helpers";

// Roda uma vez antes e uma vez depois da suite: o banco dev fica sem dados de teste
// mesmo que uma execucao anterior tenha sido interrompida.
export default async function prepararBanco() {
  const db = bancoServico();
  await apagarTenantsDeTeste(db);
  return async () => {
    await apagarTenantsDeTeste(db);
  };
}
