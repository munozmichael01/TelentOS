import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-extrabold text-[13px] transition-all cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* coral with hard shadow — primary call to action */
        default:
          "text-white bg-[#F1543F] border-2 border-[#1A1A17] rounded-[11px] shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#1A1A17] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#1A1A17]",
        /* surface with hard shadow — secondary action */
        outline:
          "text-[#1A1A17] bg-[#FCFAF6] border-2 border-[#1A1A17] rounded-[11px] shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#1A1A17] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#1A1A17]",
        /* brand teal — used for confirmations */
        brand:
          "text-white bg-[#0E5C4A] border-2 border-[#1A1A17] rounded-[11px] shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#1A1A17] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#1A1A17]",
        secondary: "bg-secondary text-secondary-foreground rounded-[11px] border border-border hover:bg-secondary/80",
        destructive: "bg-[#BD4332] text-white border-2 border-[#1A1A17] rounded-[11px] shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#1A1A17]",
        ghost: "hover:bg-[#EFEBE1] hover:text-[#1A1A17] rounded-[10px]",
        link: "text-[#0E5C4A] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
