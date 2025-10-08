-- 1) Ensure private bucket exists for user ID images
insert into storage.buckets (id, name, public)
values ('usersdis', 'usersdis', false)
on conflict (id) do nothing;

-- 2) Extend docx to support user-submitted IDs (link to auth user during signup)
alter table public.docx add column if not exists userid uuid;

-- 3) Policies for docx to handle user submissions (users can insert, cannot read; admins manage by barangay)
-- Users can create their own doc submissions (no resid at signup)
create policy "Docx: Users can insert own sign-up IDs"
  on public.docx
  for insert
  to authenticated
  with check (
    userid = auth.uid() and resid is null
  );

-- Admins/staff can manage user-submitted IDs when in the same barangay as the submitting user
create policy "Docx: Admin manage user-submitted IDs by brgy"
  on public.docx
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p_admin
      join public.profiles p_user on p_user.id = public.docx.userid
      where p_admin.id = auth.uid()
        and p_admin.role in ('admin','staff')
        and p_admin.brgyid = p_user.brgyid
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p_admin
      join public.profiles p_user on p_user.id = public.docx.userid
      where p_admin.id = auth.uid()
        and p_admin.role in ('admin','staff')
        and p_admin.brgyid = p_user.brgyid
    )
  );

-- 4) Storage policies for usersdis bucket
-- Allow authenticated users to upload only to dis/{userId}/
create policy "usersdis: Users can upload their own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'usersdis'
    and (storage.foldername(name))[1] = 'dis'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow admins/staff to view files in usersdis for users in their barangay
create policy "usersdis: Admins can view by brgy"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'usersdis'
    and exists (
      select 1
      from public.profiles p_admin
      join public.profiles p_user on p_user.id::text = (storage.foldername(name))[2]
      where p_admin.id = auth.uid()
        and p_admin.role in ('admin','staff')
        and p_admin.brgyid = p_user.brgyid
    )
  );

-- Allow admins/staff to delete files in usersdis for users in their barangay
create policy "usersdis: Admins can delete by brgy"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'usersdis'
    and exists (
      select 1
      from public.profiles p_admin
      join public.profiles p_user on p_user.id::text = (storage.foldername(name))[2]
      where p_admin.id = auth.uid()
        and p_admin.role in ('admin','staff')
        and p_admin.brgyid = p_user.brgyid
    )
  );