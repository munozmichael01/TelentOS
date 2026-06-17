import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[999px] px-[10px] py-[3px] text-[11.5px] font-bold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[#1A1A17] text-[#FCFAF6] border border-[#1A1A17]",
        outline:     "bg-[#FCFAF6] text-[#79746B] border-[1.5px] border-[#E7E1D4]",
        secondary:   "bg-[#F4F0E8] text-[#79746B] border border-[#E7E1D4]",
        success:     "bg-[#DCEFE3] text-[#1B6B4F]",
        warning:     "bg-[#F8E7C4] text-[#946312]",
        destructive: "bg-[#F6D9D2] text-[#BD4332]",
        info:        "bg-[#D6E4F2] text-[#2B5E8A]",
        lime:        "bg-[#EAF7C4] text-[#46540F] border border-[#D6E89A]",
        brand:       "bg-[#DCEFE4] text-[#0E5C4A]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
