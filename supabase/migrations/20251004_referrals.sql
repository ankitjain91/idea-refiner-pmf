create table if not exists referral_codes (
  code text primary key,
  referrer_user_id uuid not null references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null references referral_codes(code),
  referred_user_id uuid references auth.users(id),
  status text check (status in ('clicked','signed_up','credited')) default 'clicked',
  created_at timestamptz default now(),
  unique (code, referred_user_id)
);

create table if not exists credits_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  delta int not null,
  reason text,
  created_at timestamptz default now()
);

alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table credits_ledger enable row level security;

create policy "own codes" on referral_codes for select using (auth.uid() = referrer_user_id);
create policy "insert codes" on referral_codes for insert with check (auth.uid() = referrer_user_id);

create policy "own ledger" on credits_ledger for select using (auth.uid() = user_id);
create policy "insert ledger" on credits_ledger for insert with check (auth.uid() = user_id);
