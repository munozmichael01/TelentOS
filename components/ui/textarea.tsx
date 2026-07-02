import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[11px] border-[1.5px] border-[#E7E1D4] bg-[#F4F0E8] px-3 py-2.5 text-sm transition-colors placeholder:text-[#79746B] focus-visible:outline-none focus-visible:border-[#0E5C4A] focus-visible:ring-[3px] focus-visible:ring-[#DCEFE4] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
