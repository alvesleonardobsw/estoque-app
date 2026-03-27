"use client";

type Props = {
  formId: string;
};

export function ConfirmDeletePedidoButton({ formId }: Props) {
  return (
    <button
      type="submit"
      form={formId}
      onClick={(event) => {
        const confirmado = window.confirm("Tem certeza que deseja excluir este pedido?");
        if (!confirmado) {
          event.preventDefault();
        }
      }}
      className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700"
    >
      Excluir pedido
    </button>
  );
}
