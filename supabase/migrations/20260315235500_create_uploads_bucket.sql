insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public can view uploads" on storage.objects;
create policy "Public can view uploads"
on storage.objects
for select
to public
using (bucket_id = 'uploads');

drop policy if exists "Authenticated users can upload their own files" on storage.objects;
create policy "Authenticated users can upload their own files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Authenticated users can update their own files" on storage.objects;
create policy "Authenticated users can update their own files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'uploads'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'uploads'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Authenticated users can delete their own files" on storage.objects;
create policy "Authenticated users can delete their own files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'uploads'
  and auth.uid()::text = split_part(name, '/', 1)
);
