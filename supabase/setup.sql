-- HAM3D : base de données. À coller dans Supabase > SQL Editor > New query > Run (une seule fois, sans risque de le relancer).

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'p',
  name_fr text not null, name_en text, name_ar text,
  desc_fr text, desc_en text, desc_ar text,
  material text, lead_time text,
  price numeric(10,2), price_from boolean not null default false,
  stock_status text not null default 'in_stock',
  images jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Si une ancienne table "products" existait déjà (version précédente), on la met à niveau sans rien perdre :
alter table public.products add column if not exists lead_time text;
alter table public.products add column if not exists stock_status text not null default 'in_stock';
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists price_from boolean not null default false;
alter table public.products add column if not exists material text;
alter table public.products add column if not exists updated_at timestamptz not null default now();
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='available') then
    update public.products set stock_status = case when available then 'in_stock' else 'out' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='image_url') then
    update public.products set images = jsonb_build_array(image_url) where image_url is not null and jsonb_array_length(images) = 0;
  end if;
end $$;

alter table public.products drop constraint if exists products_category_chk;
alter table public.products add constraint products_category_chk check (category in ('p','d','m','s'));
alter table public.products drop constraint if exists products_stock_chk;
alter table public.products add constraint products_stock_chk check (stock_status in ('in_stock','on_order','out'));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists t_products_upd on public.products;
create trigger t_products_upd before update on public.products for each row execute function public.touch_updated_at();

-- SÉCURITÉ : RLS activé et AUCUNE règle pour le navigateur => personne ne peut lire/écrire cette table depuis le web.
-- Seul le serveur Vercel (clé secrète) y accède.
alter table public.products enable row level security;
drop policy if exists "products: lecture publique" on public.products;
drop policy if exists "products: admin écrit" on public.products;
revoke all on public.products from anon, authenticated;

-- Stockage des photos : dossier public en lecture (pour afficher les images), écriture uniquement par le serveur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/webp','image/jpeg','image/png'];
