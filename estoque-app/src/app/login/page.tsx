import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const sessao = await getOptionalSession();
  if (sessao) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LoginForm />
    </main>
  );
}
