"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BuyCreditsButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout/paid", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore pagamento");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading}
        variant="outline"
        size="full"
        className="border-worker/30 text-amber-800 hover:bg-worker-soft"
      >
        {loading ? "Reindirizzamento…" : "Acquista pacchetto — 5 crediti"}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
