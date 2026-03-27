"use client";

import { TrashIcon } from "@/components/action-icons";

type Props = {
  formId: string;
};

export function ConfirmDeleteButton({ formId }: Props) {
  return (
    <button
      type="submit"
      form={formId}
      onClick={(event) => {
        const confirmado = window.confirm("Tem certeza que deseja excluir este cliente?");
        if (!confirmado) {
          event.preventDefault();
        }
      }}
      className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700"
      aria-label="Excluir cliente"
      title="Excluir cliente"
    >
      <TrashIcon />
    </button>
  );
}
