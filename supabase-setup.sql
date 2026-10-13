-- Noleya Live Database Schema (Supabase)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/snyfosgpvehdzqqvsvxb/sql

-- 1. Donations Table
create table if not exists public.donations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reference text,
  paystack_reference text,
  amount numeric not null,
  currency text not null default 'GHS',
  is_monthly boolean default false,
  payment_method text not null,
  provider text,
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  status text not null default 'pending_verification'
);

alter table public.donations enable row level security;

-- Allow anonymous donors to insert contributions from the live site
create policy "Allow anonymous insert on donations"
  on public.donations
  for insert
  with check (true);

create policy "Allow read on donations for authenticated users"
  on public.donations
  for select
  using (auth.role() = 'authenticated');

-- 2. Volunteers Table
create table if not exists public.volunteers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  location text not null,
  interest text not null,
  message text,
  status text not null default 'new'
);

alter table public.volunteers enable row level security;

-- Allow anonymous users to submit volunteer applications
create policy "Allow anonymous insert on volunteers"
  on public.volunteers
  for insert
  with check (true);

create policy "Allow read on volunteers for authenticated users"
  on public.volunteers
  for select
  using (auth.role() = 'authenticated');
