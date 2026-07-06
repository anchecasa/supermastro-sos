"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.error("[sentry-stub]", error);
  }

  return (
    <html lang="it">
      <body className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-bold">Qualcosa è andato storto</h1>
          <p className="text-sm text-zinc-600">
            Riprova tra poco. Se il problema persiste contattaci.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
