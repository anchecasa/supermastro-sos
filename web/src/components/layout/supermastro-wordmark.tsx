import { cn } from "@/lib/utils";

type SuperMastroWordmarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS = {
  sm: "text-base sm:text-lg",
  md: "text-xl sm:text-2xl",
  lg: "text-3xl sm:text-5xl",
} as const;

/** Wordmark ufficiale SuperMastro — allineato a supermastro.com (header). */
export function SuperMastroWordmark({ className, size = "sm" }: SuperMastroWordmarkProps) {
  return (
    <span className={cn("font-extrabold tracking-tight", SIZE_CLASS[size], className)}>
      <span className="text-[#1A1A1A]">Super</span>
      <span className="text-[#F05000]">Mastro</span>
    </span>
  );
}
