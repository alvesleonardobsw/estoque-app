"use client";

import { useActionState } from "react";
import { autenticar } from "./actions";

const initialState = {
  ok: false,
  message: "",
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(autenticar, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-xl border border-black/10 bg-surface p-5">
      <h1 className="text-xl font-semibold">Entrar no sistema</h1>

      <label className="flex flex-col gap-1 text-sm">
        Login
        <input
          name="usuario"
          type="text"
          autoComplete="username"
          required
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
        />
      </label>

      {state.message ? (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

