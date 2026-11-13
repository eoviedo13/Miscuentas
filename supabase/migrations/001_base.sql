-- Fase 1: tablas base de Mis Cuentas con seguridad por usuario (Row Level Security).
-- Se ejecuta una sola vez en Supabase > SQL Editor.

-- Un movimiento (gasto o ingreso). El id lo genera la app, por eso es texto.
create table if not exists public.movimientos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id      text not null,
  tipo    text not null check (tipo in ('g', 'i')),
  monto   bigint not null check (monto > 0),   -- pesos enteros, sin decimales
  cat     text not null,
  descr   text not null default '',
  fecha   date not null,
  t       bigint not null,                     -- momento en que se anotó (ms); ordena y sirve para "deshacer"
  msg     text not null default '',            -- lote: los movimientos de un mismo mensaje comparten msg
  texto   text not null default '',            -- lo que escribiste, tal cual
  cuenta  text,
  origen  text not null default 'app' check (origen in ('app', 'voz', 'whatsapp', 'importado')),
  primary key (user_id, id)
);
create index if not exists movimientos_user_fecha on public.movimientos (user_id, fecha);

-- Ajustes de la app (presupuestos, fijos, metas, deudas, cuentas, recordatorio): un documento por clave.
create table if not exists public.ajustes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  clave   text not null,
  datos   jsonb not null default '{}'::jsonb,
  primary key (user_id, clave)
);

-- Datos de tu perfil: aquí se vinculará tu número de WhatsApp (Fase 4).
create table if not exists public.perfiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  whatsapp   text unique,
  zona       text not null default 'America/Bogota',
  creado_en  timestamptz not null default now()
);

-- Al crearse un usuario se le crea su perfil.
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- Seguridad: cada usuario solo ve y toca lo suyo.
alter table public.movimientos enable row level security;
alter table public.ajustes     enable row level security;
alter table public.perfiles    enable row level security;

create policy "movimientos: solo los mios" on public.movimientos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ajustes: solo los mios" on public.ajustes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- El número de WhatsApp lo vincula el servidor (Fase 4), no el navegador: el usuario solo puede leer su perfil.
create policy "perfiles: leer el mio" on public.perfiles
  for select to authenticated using (user_id = auth.uid());
