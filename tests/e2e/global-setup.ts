import { apagarTenantsDeTeste, bancoServico } from "../db/helpers";

// Limpa sobras de execucoes interrompidas antes de comecar.
export default async function prepararBanco() {
  await apagarTenantsDeTeste(bancoServico());
}
