-- Gate A — Test S1: contact_vault deny-all
-- Eseguire come utente autenticato artigiano (SQL Editor con JWT o da app)

-- 1. Verifica RLS attivo
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'contact_vault';
-- atteso: rowsecurity = true

-- 2. Verifica assenza policy (solo service role può leggere)
select count(*) as policy_count
from pg_policies
where schemaname = 'public' and tablename = 'contact_vault';
-- atteso: policy_count = 0

-- 3. Seed test vault row (solo service role / SQL editor admin)
-- insert into contact_vault (owner_type, owner_id, phone, email)
-- values ('worker', '00000000-0000-0000-0000-000000000001', '+390000000000', 'test@example.com');

-- 4. Da client con JWT artigiano: select * from contact_vault → 0 righe

-- 5. PostGIS attivo
select postgis_version();

-- 6. Pilot zone seed
select id, name, city, is_active from pilot_zones;

-- 7. Skills seed
select slug, label from skills order by slug;
