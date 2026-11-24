-- =====================================================
-- Proyecto Supabase: quimicos-la-bella-db
-- Pegar y ejecutar en: SQL Editor > New query > Run
-- =====================================================

create table if not exists public.lotes (
  id         bigint generated always as identity primary key,
  fecha      date        not null,
  cajon      text        not null check (cajon in ('240', '280')),
  densidad   text        not null,
  cantidad   integer     not null check (cantidad > 0),
  created_at timestamptz not null default now()
);

-- Índice para que los reportes por rango de fechas sean rápidos
create index if not exists lotes_fecha_idx on public.lotes (fecha);

-- Seguridad a nivel de fila (obligatorio en Supabase)
alter table public.lotes enable row level security;

-- La app usa la clave "anon" (pública), así que se habilitan estas 3 operaciones.
-- No se permite UPDATE: si hay un error, se borra el lote y se carga de nuevo.
create policy "anon lee lotes"
  on public.lotes for select to anon using (true);

create policy "anon agrega lotes"
  on public.lotes for insert to anon with check (true);

create policy "anon borra lotes"
  on public.lotes for delete to anon using (true);
