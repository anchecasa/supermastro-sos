import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "max-w-lg sm:max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-6xl",
} as const;

export function ContentPage({ children, className, size = "md" }: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 space-y-6 px-4 py-8 sm:px-6 sm:py-10",
        sizeClass[size],
        className
      )}
    >
      {children}
    </div>
  );
}
