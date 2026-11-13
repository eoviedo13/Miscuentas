-- Hace que los cambios (por ejemplo, lo que anota el bot de WhatsApp) aparezcan al instante en la app.
alter publication supabase_realtime add table public.movimientos;
alter publication supabase_realtime add table public.ajustes;
