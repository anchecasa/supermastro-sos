type Props = {
  items: { value: string; label: string }[];
};

export function TrustStrip({ items }: Props) {
  return (
    <section className="border-y border-[var(--border)] bg-white py-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
            <p className="mt-1 text-sm text-muted">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
