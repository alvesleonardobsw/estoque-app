"use client";

export function PrintControls() {
  return (
    <div className="mb-4 flex gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
      >
        Imprimir
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded-lg border border-black/20 px-3 py-2 text-sm"
      >
        Fechar
      </button>
    </div>
  );
}
