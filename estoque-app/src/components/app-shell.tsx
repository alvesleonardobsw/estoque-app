"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { sair } from "@/app/login/actions";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/produtos", label: "Produtos" },
  { href: "/pedidos", label: "Pedidos" },
];

function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary text-primary-contrast"
                : "text-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-60 border-r border-black/10 bg-surface p-4 md:flex md:flex-col md:gap-2">
          <h1 className="mb-4 text-lg font-semibold text-primary">Estoque App</h1>
          <NavLinks />
          <form action={sair} className="mt-auto pt-4">
            <button
              type="submit"
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Sair
            </button>
          </form>
        </aside>

        <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-black/10 bg-surface/95 p-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          <NavLinks />
          <form action={sair}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Sair
            </button>
          </form>
        </div>
      </nav>
    </div>
  );
}
