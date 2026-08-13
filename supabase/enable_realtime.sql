-- Run once in Supabase SQL Editor to enable Realtime for the customer menu.
-- Dashboard: Database → Replication → supabase_realtime publication, or execute below.

alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.waiter_calls;
