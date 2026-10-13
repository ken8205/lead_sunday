-- 4차 설정: 상담 대장(내원경로·마케팅 통계)과 월별 광고비. schema.sql 실행 후 한 번 실행.
-- 원칙: 통계용이라 오래 보관하므로 이름·연락처·생년월일은 저장하지 않는다(메모에는 이니셜 정도만).
-- 보드의 7일 자동 삭제(purge_old_data) 대상이 아니다.

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_date date not null default current_date,   -- 문의일 (통계는 이 날짜 기준)
  channel text not null default '',                  -- 문의 창구 (카카오톡, LINE, 전화 등)
  source text not null default '',                   -- 알게 된 경로 (네이버, 인스타, 지인 소개 등)
  campaign text not null default '',                 -- 광고·이벤트 이름 (선택)
  nationality text not null default '',              -- 국적
  interest text not null default '',                 -- 관심 시술
  stage text not null default 'inquiry' check (stage in ('inquiry', 'booked', 'visited', 'paid')),
  amount integer check (amount is null or amount >= 0), -- 결제 금액 (만원)
  note text not null default '' check (char_length(note) <= 100), -- 이니셜·짧은 메모
  staff text not null default '',                    -- 담당자
  created_by uuid default auth.uid() references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_date_idx on public.inquiries (inquiry_date);

-- 월별·경로별 광고비 (만원)
create table if not exists public.ad_costs (
  month text not null check (month ~ '^\d{4}-\d{2}$'), -- YYYY-MM
  source text not null,
  amount integer not null check (amount >= 0),
  primary key (month, source)
);

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

alter table public.inquiries enable row level security;
alter table public.ad_costs enable row level security;

-- 상담 대장: 활성 직원 누구나 입력·수정 (코디가 입력), 삭제는 원장·실장만
create policy "staff can read inquiries" on public.inquiries for select to authenticated using (public.is_active_staff());
create policy "staff can write inquiries" on public.inquiries for insert to authenticated with check (public.is_active_staff());
create policy "staff can update inquiries" on public.inquiries for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "lead can delete inquiries" on public.inquiries for delete to authenticated using (public.is_active_lead());

-- 광고비: 원장·실장만 보고 입력
create policy "lead can read ad_costs" on public.ad_costs for select to authenticated using (public.is_active_lead());
create policy "lead can write ad_costs" on public.ad_costs for insert to authenticated with check (public.is_active_lead());
create policy "lead can update ad_costs" on public.ad_costs for update to authenticated using (public.is_active_lead()) with check (public.is_active_lead());
create policy "lead can delete ad_costs" on public.ad_costs for delete to authenticated using (public.is_active_lead());

alter publication supabase_realtime add table public.inquiries;
