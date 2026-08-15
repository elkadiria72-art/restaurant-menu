-- Optional order notes column (exact key: notes).
alter table public.orders
  add column if not exists notes text;

comment on column public.orders.notes is 'Optional special instructions from the customer at checkout';
