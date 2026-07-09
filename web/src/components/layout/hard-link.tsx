import type { ComponentProps } from "react";

type HardLinkProps = ComponentProps<"a"> & {
  href: string;
};

/** Link con navigazione browser nativa (reload). Richiesto su anchecasa.it/* via proxy Pages. */
export function HardLink({ href, ...props }: HardLinkProps) {
  return <a href={href} {...props} />;
}
