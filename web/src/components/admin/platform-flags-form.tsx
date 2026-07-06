"use client";

import { useTransition } from "react";
import { setPlatformFlag } from "@/app/admin/actions";

type Props = {
  pilotPublic: boolean;
  smsOnlyMode: boolean;
};

export function PlatformFlagsForm({ pilotPublic, smsOnlyMode }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm">Go-live pubblico (pilot_public)</span>
        <input
          type="checkbox"
          defaultChecked={pilotPublic}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              await setPlatformFlag("pilot_public", e.target.checked);
            })
          }
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm">SMS-only mode (R3)</span>
        <input
          type="checkbox"
          defaultChecked={smsOnlyMode}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              await setPlatformFlag("sms_only_mode", e.target.checked);
            })
          }
        />
      </label>
    </div>
  );
}
