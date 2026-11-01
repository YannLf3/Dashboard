-- =========================================================
-- Cockpit Yannlf3 — schéma Supabase
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Réexécutable sans risque (if not exists / or replace).
-- =========================================================

-- 1. Une table unique : chaque ligne = un enregistrement d'une
--    « collection » (clients, documents, payments…), stocké en JSON.
create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null check (collection in
               ('settings','clients','projects','documents','payments','checklist','time','simulations','declarations','drafts')),
  id         text        not null,
  data       jsonb       not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

-- 2. Row Level Security : sans politique, PERSONNE ne lit rien.
--    Chaque politique autorise un utilisateur connecté à agir
--    uniquement sur SES lignes (user_id = son identifiant).
alter table public.records enable row level security;

drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;
drop policy if exists "records_delete_own" on public.records;

create policy "records_select_own" on public.records
  for select to authenticated using (user_id = (select auth.uid()));
create policy "records_insert_own" on public.records
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "records_update_own" on public.records
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "records_delete_own" on public.records
  for delete to authenticated using (user_id = (select auth.uid()));

-- 3. Numérotation : deux documents du même type ne peuvent pas
--    porter le même numéro (même émis depuis deux appareils).
create unique index if not exists records_document_number_uniq
  on public.records (user_id, (data->>'kind'), (data->>'number'))
  where collection = 'documents' and data->>'number' is not null;

-- 4. Date de dernière modification tenue par la base
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before update on public.records
  for each row execute function public.touch_updated_at();

-- 5. Document émis = figé, même si quelqu'un contourne l'interface.
--    Seuls les champs de suivi peuvent encore changer.
create or replace function public.protect_emitted_documents()
returns trigger language plpgsql set search_path = '' as $$
declare
  mutable text[] := array['status', 'sentAt', 'internalNote', 'updatedAt', 'signedAt', 'reminders'];
begin
  if old.collection <> 'documents' or coalesce(old.data->>'status', 'brouillon') = 'brouillon' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Document émis : suppression interdite (corrige une facture par un avoir).';
  end if;
  if (old.data - mutable) is distinct from (new.data - mutable) then
    raise exception 'Document émis : son contenu est figé.';
  end if;
  if new.data->>'status' = 'brouillon' then
    raise exception 'Un document émis ne peut pas redevenir un brouillon.';
  end if;
  return new;
end $$;

drop trigger if exists records_protect on public.records;
create trigger records_protect before update or delete on public.records
  for each row execute function public.protect_emitted_documents();
