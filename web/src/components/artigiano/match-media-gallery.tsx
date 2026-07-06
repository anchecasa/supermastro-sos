"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SIGNED_URL_TTL_SEC } from "@/lib/sos/constants";

type Props = {
  matchId: string;
};

export function MatchMediaGallery({ matchId }: Props) {
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: paths, error: pathError } = await supabase.rpc(
        "list_match_media_paths",
        { p_match_id: matchId }
      );

      if (pathError) {
        setError(pathError.message);
        return;
      }

      const signed: string[] = [];
      for (const row of paths ?? []) {
        const { data, error: signError } = await supabase.storage
          .from("request-media")
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SEC);

        if (signError || !data?.signedUrl) continue;
        signed.push(data.signedUrl);
      }
      setUrls(signed);
    };

    void load();
  }, [matchId]);

  if (error) return null;
  if (urls.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase text-zinc-500">Foto del problema</p>
      <div className="grid gap-2">
        {urls.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt="Foto intervento"
            className="w-full rounded-lg object-cover"
          />
        ))}
      </div>
    </div>
  );
}
