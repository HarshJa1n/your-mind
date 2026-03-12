-- Enable required extensions
create extension if not exists "vector" with schema "extensions";
create extension if not exists "uuid-ossp" with schema "extensions";

-- Users profile table (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  preferred_language text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Saved content items
create table public.items (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_type text not null check (content_type in ('article', 'note', 'image', 'pdf', 'audio')),

  -- Original content
  original_title text,
  original_summary text,
  original_content text,
  original_language text,
  source_url text,

  -- Translated content (user's preferred language)
  translated_title text,
  translated_summary text,
  translated_language text,

  -- AI-generated
  auto_tags text[] default '{}',
  auto_tags_original text[] default '{}',
  content_category text,

  -- Embedding (Gemini Embedding 2 = 3072 dims)
  embedding extensions.vector(3072),

  -- Media
  thumbnail_url text,
  media_urls text[] default '{}',

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.items enable row level security;

create policy "Users can view own items"
  on public.items for select
  using (auth.uid() = user_id);

create policy "Users can insert own items"
  on public.items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own items"
  on public.items for update
  using (auth.uid() = user_id);

create policy "Users can delete own items"
  on public.items for delete
  using (auth.uid() = user_id);

-- Index for vector similarity search
create index items_embedding_idx on public.items
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- Cached full-content translations
create table public.translations_cache (
  id uuid primary key default extensions.uuid_generate_v4(),
  item_id uuid references public.items(id) on delete cascade not null,
  target_language text not null,
  translated_content text not null,
  created_at timestamptz default now(),
  unique (item_id, target_language)
);

alter table public.translations_cache enable row level security;

create policy "Users can view own translations"
  on public.translations_cache for select
  using (
    exists (
      select 1 from public.items
      where items.id = translations_cache.item_id
      and items.user_id = auth.uid()
    )
  );

create policy "Users can insert own translations"
  on public.translations_cache for insert
  with check (
    exists (
      select 1 from public.items
      where items.id = translations_cache.item_id
      and items.user_id = auth.uid()
    )
  );

-- Smart Spaces
create table public.spaces (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  name_original text,
  is_auto boolean default true,
  filter_rules jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.spaces enable row level security;

create policy "Users can view own spaces"
  on public.spaces for select
  using (auth.uid() = user_id);

create policy "Users can manage own spaces"
  on public.spaces for all
  using (auth.uid() = user_id);

-- Function for semantic search
create or replace function match_items(
  query_embedding extensions.vector(3072),
  match_threshold float default 0.5,
  match_count int default 20,
  filter_user_id uuid default null
)
returns table (
  id uuid,
  content_type text,
  original_title text,
  translated_title text,
  original_summary text,
  translated_summary text,
  translated_language text,
  auto_tags text[],
  thumbnail_url text,
  source_url text,
  content_category text,
  similarity float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    items.id,
    items.content_type,
    items.original_title,
    items.translated_title,
    items.original_summary,
    items.translated_summary,
    items.translated_language,
    items.auto_tags,
    items.thumbnail_url,
    items.source_url,
    items.content_category,
    1 - (items.embedding <=> query_embedding) as similarity,
    items.created_at
  from public.items
  where items.user_id = filter_user_id
    and 1 - (items.embedding <=> query_embedding) > match_threshold
  order by items.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_updated_at
  before update on public.items
  for each row execute function public.update_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
