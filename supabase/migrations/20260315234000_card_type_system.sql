alter table public.items
  add column if not exists card_type text default 'article',
  add column if not exists card_metadata jsonb default '{}'::jsonb;

alter table public.items
  drop constraint if exists items_content_type_check;

alter table public.items
  add constraint items_content_type_check
  check (content_type in ('article', 'note', 'image', 'pdf', 'audio', 'video'));

update public.items
set
  card_type = coalesce(card_type, content_type, 'article'),
  card_metadata = coalesce(card_metadata, '{}'::jsonb)
where card_type is null or card_metadata is null;

alter table public.items
  alter column card_type set default 'article',
  alter column card_metadata set default '{}'::jsonb;

create index if not exists items_card_type_idx on public.items (card_type);
