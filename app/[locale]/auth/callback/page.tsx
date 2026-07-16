import { Suspense } from "react";
import { AuthCallback } from "@/components/features/auth-callback";

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#F4F0E8",
      }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", letterSpacing: "1px", color: "#79746B" }}>
          VERIFICANDO…
        </span>
      </div>
    }>
      <AuthCallback />
    </Suspense>
  );
}
