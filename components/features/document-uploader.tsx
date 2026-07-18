"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DocumentUploader({ employeeId }: { employeeId: string }) {
  const t = useTranslations("People");
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/employees/${employeeId}/documents`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("detail.documents.uploadError"));
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <Upload className="h-4 w-4" />
        {uploading ? t("detail.documents.uploading") : t("detail.documents.uploadBtn")}
        <Input
          type="file"
          className="max-w-xs"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
