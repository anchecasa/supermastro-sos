import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        client: "bg-brand-soft text-brand",
        worker: "bg-worker-soft text-amber-800",
        muted: "bg-black/[0.04] text-muted data-[theme=worker]:bg-white/[0.06]",
        success: "bg-emerald-500/10 text-emerald-700 data-[theme=worker]:text-emerald-300",
        warning: "bg-amber-500/10 text-amber-800 data-[theme=worker]:text-amber-200",
      },
    },
    defaultVariants: {
      variant: "client",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
