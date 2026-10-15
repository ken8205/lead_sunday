-- 페이스플러스 상담 통계 DB 구성 (Supabase SQL Editor에서 한 번 실행, 여러 번 실행해도 안전)
-- 환자 동선 보드와 같은 Supabase 프로젝트에 실행하면 직원 계정(staff)을 함께 쓴다.
-- 새 프로젝트에 실행해도 되며, 그때는 staff 표가 새로 생기므로 직원 프로필을 따로 넣는다.
-- 원칙: 로그인한 "활성" 직원만 읽고 쓸 수 있다. 로그인하지 않은 요청은 아무것도 볼 수 없다.
-- 원칙: 문의는 누구인지 적지 않는다. 상담·시술 카드의 이름은 선택. 연락처·생년월일은 저장하지 않는다.
-- 보드의 7일 자동 삭제(purge_old_data) 대상이 아니다.

-- 직원 프로필 (동선 보드와 공용). 이미 있으면 그대로 둔다.
create table if not exists public.staff (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('doctor', 'manager', 'nurse', 'coordinator')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff s where s.id = auth.uid() and s.active)
$$;

drop policy if exists "staff can read staff" on public.staff;
drop policy if exists "staff can read staff" on public.staff;
create policy "staff can read staff" on public.staff for select to authenticated using (public.is_active_staff());

-- 하루 기록장: 그날 일어난 일(문의·상담·시술)을 그날 한 장씩. 예전 기록을 찾아 고치지 않는다.
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,     -- 일어난 날
  kind text not null check (kind in ('inquiry', 'consult', 'treatment')), -- 문의 / 상담 / 시술
  source text not null,                              -- 유입 경로 (모르면 '모름')
  channel text not null default '',                  -- 문의 채널 (문의 카드만)
  nationality text not null default '',
  interest text not null default '',                 -- 문의·상담: 관심 시술, 시술: 한 시술
  amount integer check (amount is null or amount >= 0), -- 시술 총액 (만원) = 그날 매출
  patient_name text not null default '' check (char_length(patient_name) <= 40), -- 상담·시술 카드에 선택
  note text not null default '' check (char_length(note) <= 100), -- 짧은 메모 (연락처 금지)
  created_by uuid default auth.uid() references public.staff (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists entries_date_idx on public.entries (entry_date);

-- 월별·경로별 광고비 (만원)
create table if not exists public.ad_costs (
  month text not null check (month ~ '^\d{4}-\d{2}$'), -- YYYY-MM
  source text not null,
  amount integer not null check (amount >= 0),
  primary key (month, source)
);

-- 경로별 수수료율 (%): 그 경로 환자의 시술 총액 × 수수료율 = 마케팅비 (예: 메이비 30, 미뷰 40)
create table if not exists public.commission_rates (
  source text primary key,
  rate numeric not null check (rate > 0 and rate <= 100)
);
insert into public.commission_rates (source, rate) values ('메이비', 30), ('미뷰', 40) on conflict (source) do nothing;

-- 입력 화면 선택지 (문의 채널, 유입 경로, 국적, 관심 시술). 순서 그대로 화면에 나온다.
-- 한 번도 저장하지 않은 종류는 앱의 기본 목록을 쓴다.
create table if not exists public.option_lists (
  kind text primary key check (kind in ('channel', 'source', 'nationality', 'interest', 'agency')), -- agency: 에이전시 경로 목록
  items text[] not null
);

-- 이전 버전 표에 'agency' 종류 허용
alter table public.option_lists drop constraint if exists option_lists_kind_check;
alter table public.option_lists add constraint option_lists_kind_check check (kind in ('channel', 'source', 'nationality', 'interest', 'agency'));

-- 원장·실장만 (광고비 입력, 통계 화면)
create or replace function public.is_active_lead()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff s where s.id = auth.uid() and s.active and s.role in ('doctor', 'manager'))
$$;

alter table public.entries enable row level security;
alter table public.ad_costs enable row level security;
alter table public.commission_rates enable row level security;
alter table public.option_lists enable row level security;

-- 기록: 활성 직원 누구나 입력·수정·삭제 (잘못 적은 카드를 바로 지울 수 있게)
drop policy if exists "staff can read entries" on public.entries;
create policy "staff can read entries" on public.entries for select to authenticated using (public.is_active_staff());
drop policy if exists "staff can write entries" on public.entries;
create policy "staff can write entries" on public.entries for insert to authenticated with check (public.is_active_staff());
drop policy if exists "staff can update entries" on public.entries;
create policy "staff can update entries" on public.entries for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
drop policy if exists "staff can delete entries" on public.entries;
create policy "staff can delete entries" on public.entries for delete to authenticated using (public.is_active_staff());

-- 선택지: 직원 누구나 읽고 바꿀 수 있다
drop policy if exists "staff can read option_lists" on public.option_lists;
create policy "staff can read option_lists" on public.option_lists for select to authenticated using (public.is_active_staff());
drop policy if exists "lead can write option_lists" on public.option_lists;
drop policy if exists "staff can write option_lists" on public.option_lists;
create policy "staff can write option_lists" on public.option_lists for insert to authenticated with check (public.is_active_staff());
drop policy if exists "lead can update option_lists" on public.option_lists;
drop policy if exists "staff can update option_lists" on public.option_lists;
create policy "staff can update option_lists" on public.option_lists for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

-- 수수료율: 원장·실장만 보고 입력
drop policy if exists "lead can read commission_rates" on public.commission_rates;
create policy "lead can read commission_rates" on public.commission_rates for select to authenticated using (public.is_active_lead());
drop policy if exists "lead can write commission_rates" on public.commission_rates;
create policy "lead can write commission_rates" on public.commission_rates for insert to authenticated with check (public.is_active_lead());
drop policy if exists "lead can update commission_rates" on public.commission_rates;
create policy "lead can update commission_rates" on public.commission_rates for update to authenticated using (public.is_active_lead()) with check (public.is_active_lead());
drop policy if exists "lead can delete commission_rates" on public.commission_rates;
create policy "lead can delete commission_rates" on public.commission_rates for delete to authenticated using (public.is_active_lead());

-- 광고비: 원장·실장만 보고 입력
drop policy if exists "lead can read ad_costs" on public.ad_costs;
create policy "lead can read ad_costs" on public.ad_costs for select to authenticated using (public.is_active_lead());
drop policy if exists "lead can write ad_costs" on public.ad_costs;
create policy "lead can write ad_costs" on public.ad_costs for insert to authenticated with check (public.is_active_lead());
drop policy if exists "lead can update ad_costs" on public.ad_costs;
create policy "lead can update ad_costs" on public.ad_costs for update to authenticated using (public.is_active_lead()) with check (public.is_active_lead());
drop policy if exists "lead can delete ad_costs" on public.ad_costs;
create policy "lead can delete ad_costs" on public.ad_costs for delete to authenticated using (public.is_active_lead());

-- 실시간 반영 (이미 등록돼 있으면 건너뜀)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entries') then
    alter publication supabase_realtime add table public.entries;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'option_lists') then
    alter publication supabase_realtime add table public.option_lists;
  end if;
end $$;
