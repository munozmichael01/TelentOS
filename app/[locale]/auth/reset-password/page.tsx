import { ResetPasswordForm } from "@/components/features/reset-password-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        background: "radial-gradient(130% 80% at 50% -10%, #F7F3EB 0%, #F4F0E8 60%)",
      }}
    >
      <ResetPasswordForm />
    </div>
  );
}
