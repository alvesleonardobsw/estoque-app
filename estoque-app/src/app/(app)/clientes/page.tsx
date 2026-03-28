import { ClienteForm } from "./cliente-form";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import Link from "next/link";
import { EditIcon, MapPinIcon } from "@/components/action-icons";

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

type PageProps = {
  searchParams: Promise<{ editar?: string; erro?: string; novo?: string }>;
};

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const editarId = typeof params.editar === "string" ? params.editar : "";
  const erroAcao = typeof params.erro === "string" ? params.erro : "";
  const novo = typeof params.novo === "string" ? params.novo : "";
  const { clientes, erro } = await listarClientes();
  const clienteEdicao = clientes.find((cliente) => cliente.id === editarId) ?? null;
  const mostrarFormulario = Boolean(clienteEdicao) || novo === "1";

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-foreground/70">Cadastro</p>
          <h1 className="text-2xl font-semibold">Clientes</h1>
        </div>
        {!mostrarFormulario ? (
          <Link
            href="/clientes?novo=1"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
          >
            Cadastrar cliente
          </Link>
        ) : null}
      </header>

      {!hasSupabaseEnv() ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Configure as variaveis `NEXT_PUBLIC_SUPABASE_URL` e
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` no arquivo `.env.local` para habilitar o
          cadastro de clientes.
        </article>
      ) : null}

      {mostrarFormulario ? (
        <ClienteForm
          key={clienteEdicao?.id ?? "novo"}
          clienteEdicao={clienteEdicao}
          mostrarCancelarNovo={!clienteEdicao}
        />
      ) : null}

      {erro ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nao foi possivel carregar clientes ainda: {erro}. Execute o SQL de
          `supabase/schema.sql` no Supabase e recarregue a pagina.
        </article>
      ) : null}

      {erroAcao === "cliente-com-pedidos" ? (
        <article className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Nao foi possivel excluir o cliente porque ele ja possui pedidos cadastrados.
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
                  <td className="px-2 py-2">{cliente.nome}</td>
                  <td className="px-2 py-2">{cliente.telefone || "-"}</td>
                  <td className="px-2 py-2">{cliente.endereco || "-"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      {cliente.endereco ? (
                        <Link
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            cliente.endereco,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-black/20 p-2 text-xs"
                          aria-label="Abrir endereco no Google Maps"
                          title="Ver no Google Maps"
                        >
                          <MapPinIcon />
                        </Link>
                      ) : (
                        <span
                          className="cursor-not-allowed rounded-md border border-black/10 p-2 text-xs text-black/30"
                          title="Cliente sem endereco cadastrado"
                        >
                          <MapPinIcon />
                        </span>
                      )}

                      <Link
                        href={`/clientes?editar=${cliente.id}`}
                        className="rounded-md border border-black/20 p-2 text-xs"
                        aria-label="Editar cliente"
                        title="Editar cliente"
                      >
                        <EditIcon />
                      </Link>
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
