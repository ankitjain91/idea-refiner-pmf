create or replace function top_referrers()
returns table (handle text, referrals int)
language sql stable as $$
  select coalesce(u.raw_user_meta_data->>'handle', left(c.referrer_user_id::text,8)) as handle,
         count(*)::int as referrals
  from referrals r
  join referral_codes c on r.code = c.code
  left join auth.users u on u.id = c.referrer_user_id
  where r.created_at > now() - interval '7 days' and r.status = 'credited'
  group by handle
  order by referrals desc
  limit 20;
$$;
