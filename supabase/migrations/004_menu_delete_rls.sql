-- Allow deleting categories (cascades items + modifiers) for "clear menu" flows.
-- Dev-mode open policy; tighten with auth in production.

create policy "public delete categories" on public.categories for delete using (true);
