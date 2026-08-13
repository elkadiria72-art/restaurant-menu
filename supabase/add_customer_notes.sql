-- Add customer notes column for optional order instructions.
alter table public.orders
  add column if not exists customer_notes text;

comment on column public.orders.customer_notes is 'Optional special instructions from the customer at checkout';
