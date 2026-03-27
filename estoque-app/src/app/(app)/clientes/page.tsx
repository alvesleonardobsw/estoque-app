import { ClienteForm } from "./cliente-form";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

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
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-black/5">
                  <td className="px-2 py-2">{cliente.nome}</td>
                  <td className="px-2 py-2">{cliente.telefone || "-"}</td>
                  <td className="px-2 py-2">{cliente.endereco || "-"}</td>
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
