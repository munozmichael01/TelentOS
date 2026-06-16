import { LoginForm } from "@/components/features/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <LoginForm />
    </div>
  );
}
