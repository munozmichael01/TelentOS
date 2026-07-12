"use client";

import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CvProfileFields } from "@/components/features/cv-profile-fields";
import type { EditableCvProfile } from "@/lib/cv-profile";

/**
 * Modal de validación del candidato en la inscripción (career site). Muestra el
 * perfil extraído del CV editable; el candidato — dueño del dato — corrige y
 * confirma antes de que se persista nada. Se apoya en el editor DS compartido.
 */
export function CvValidationModal({
  open,
  profile,
  aiStatus,
  submitting,
  error,
  onChange,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  profile: EditableCvProfile;
  aiStatus: "ok" | "fallback";
  submitting: boolean;
  error: string | null;
  onChange: (p: EditableCvProfile) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-xl max-h-[88vh] grid-rows-[auto_1fr_auto] gap-0 p-0">
        <DialogHeader className="p-5 pb-3 border-b border-line text-left">
          <div className="flex items-center gap-2">
            <DialogTitle>Revisa los datos de tu CV</DialogTitle>
            {aiStatus === "ok" && <Badge variant="brand">extraído por IA</Badge>}
          </div>
          <DialogDescription>
            Hemos leído tu CV para ahorrarte tiempo. Revisa y corrige lo que haga falta —
            estos son tus datos, tú tienes la última palabra.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-4">
          <CvProfileFields profile={profile} onChange={onChange} disabled={submitting} />
        </div>

        <div className="p-5 pt-3 border-t border-line">
          {error && <p className="text-sm text-destructive mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="brand" onClick={onConfirm} disabled={submitting}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Confirmar y enviar candidatura
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
