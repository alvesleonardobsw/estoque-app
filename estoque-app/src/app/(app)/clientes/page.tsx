import { ClienteForm } from "./cliente-form";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { atualizarCliente, excluirCliente } from "./actions";

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
};

async function listarClientes() {
  if (!hasSupabaseEnv()) {
    return { clientes: [] as Cliente[], erro: "" };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, telefone, endereco")
    .order("created_at", { ascending: false });

  if (error) {
    return { clientes: [] as Cliente[], erro: error.message };
  }

  return { clientes: (data ?? []) as Cliente[], erro: "" };
}

export default async function ClientesPage() {
  const { clientes, erro } = await listarClientes();

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm text-foreground/70">Cadastro</p>
        <h1 className="text-2xl font-semibold">Clientes</h1>
      </header>

      {!hasSupabaseEnv() ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Configure as variaveis `NEXT_PUBLIC_SUPABASE_URL` e
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` no arquivo `.env.local` para habilitar o
          cadastro de clientes.
        </article>
      ) : null}

      <ClienteForm />

      {erro ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nao foi possivel carregar clientes ainda: {erro}. Execute o SQL de
          `supabase/schema.sql` no Supabase e recarregue a pagina.
        </article>
      ) : null}

      <article className="rounded-xl border border-black/10 bg-surface p-4">
        <h2 className="text-lg font-medium">Clientes cadastrados</h2>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-foreground/70">
                <th className="px-2 py-2 font-medium">Nome</th>
                <th className="px-2 py-2 font-medium">Telefone</th>
                <th className="px-2 py-2 font-medium">Endereco</th>
                <th className="px-2 py-2 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-black/5">
                  <td className="px-2 py-2">
                    <input
                      form={`editar-cliente-${cliente.id}`}
                      name="nome"
                      defaultValue={cliente.nome}
                      className="w-full min-w-40 rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      form={`editar-cliente-${cliente.id}`}
                      name="telefone"
                      defaultValue={cliente.telefone ?? ""}
                      className="w-full min-w-32 rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      form={`editar-cliente-${cliente.id}`}
                      name="endereco"
                      defaultValue={cliente.endereco ?? ""}
                      className="w-full min-w-40 rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <form id={`editar-cliente-${cliente.id}`} action={atualizarCliente}>
                        <input type="hidden" name="id" value={cliente.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-black/20 px-2 py-1 text-xs"
                        >
                          Salvar
                        </button>
                      </form>

                      <form action={excluirCliente}>
                        <input type="hidden" name="id" value={cliente.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700"
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {clientes.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">
            Nenhum cliente cadastrado ainda.
          </p>
        ) : null}
      </article>
    </section>
  );
}
