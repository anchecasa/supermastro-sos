-- Catalogo completo attività artigiano (UI iscrizione) — SOS matching resta su sos_enabled = true

insert into public.skills (slug, label, sos_enabled) values
  ('muratore', 'Muratore', false),
  ('imbianchino', 'Imbianchino', false),
  ('cartongesso', 'Cartongesso', false),
  ('piastrellista', 'Piastrellista', false),
  ('falegname', 'Falegname', false),
  ('serramentista', 'Serramentista', false),
  ('giardiniere', 'Giardiniere', false),
  ('carpentiere', 'Carpentiere', false),
  ('climatizzazione', 'Climatizzazione', false),
  ('lattoniere', 'Lattoniere / tetto', false),
  ('ristrutturazioni', 'Ristrutturazioni', false),
  ('costruzioni', 'Costruzioni', false),
  ('pulizie', 'Pulizie', false),
  ('disinfestazione', 'Disinfestazione', false),
  ('geometra', 'Geometra', false),
  ('architetto', 'Architetto', false),
  ('ingegnere', 'Ingegnere', false)
on conflict (slug) do update set
  label = excluded.label,
  sos_enabled = excluded.sos_enabled;
