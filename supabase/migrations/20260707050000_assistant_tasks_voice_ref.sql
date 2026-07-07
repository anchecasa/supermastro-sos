-- Riferimento vocale per richiamare promemoria (es. «elimina promemoria 3»)

alter table public.assistant_tasks
  add column if not exists voice_ref text;

create unique index if not exists assistant_tasks_owner_voice_ref_idx
  on public.assistant_tasks (owner_id, voice_ref)
  where voice_ref is not null;
