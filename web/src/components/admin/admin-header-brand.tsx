import Image from "next/image";
import Link from "next/link";

export default function AdminHeaderBrand() {
  return (
    <Link href="/admin" className="flex shrink-0 items-center gap-3 no-underline">
      <Image
        src="/supermastro/supermastro-logo.png"
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 object-contain"
        priority
      />
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-tight text-slate-900">SuperMastro</p>
        <p className="truncate text-xs font-medium text-slate-500">Dashboard amministrazione</p>
      </div>
    </Link>
  );
}
