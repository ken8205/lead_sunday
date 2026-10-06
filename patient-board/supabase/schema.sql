-- 페이스플러스 환자 동선 보드 DB 구성 (Supabase SQL Editor에서 한 번 실행)
-- 원칙: 로그인한 "활성" 직원만 읽고 쓸 수 있다. 로그인하지 않은 요청은 아무것도 볼 수 없다.
-- 데이터는 만든 지 7일이 지나면 자동 삭제된다 (맨 아래 purge_old_data).

-- ───────── 표 ─────────

-- 직원 프로필. 로그인 계정(auth.users)과 1:1. 퇴사하면 active = false.
create table if not exists public.staff (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('doctor', 'manager', 'nurse', 'coordinator')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id text primary key,
  name text not null,
  x integer not null,
  y integer not null,
  w integer not null,
  h integer not null,
  ord integer not null default 0,
  tone text check (tone in ('clinic', 'front', 'support')),
  decor boolean not null default false
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date text not null default '',          -- YYYY-MM-DD, 미팅은 빈 값
  procedure text not null,                      -- 수술/시술명, 미팅은 목적
  category text check (category in ('consult', 'surgery', 'treatment', 'followup', 'meeting')),
  staff text not null default '',               -- 담당자
  room_id text not null,
  status text not null check (status in ('waiting', 'ready', 'in_progress', 'left')),
  wait_for text check (wait_for in ('doctor', 'manager', 'nurse', 'coordinator')),
  entered_room_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.moves (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  from_room_id text,
  to_room_id text not null,
  status text not null check (status in ('waiting', 'ready', 'in_progress', 'left')),
  wait_for text check (wait_for in ('doctor', 'manager', 'nurse', 'coordinator')),
  at timestamptz not null default now(),
  by_staff uuid default auth.uid() references public.staff (id) on delete set null  -- 누가 옮겼는지
);

create index if not exists moves_at_idx on public.moves (at);
create index if not exists patients_created_idx on public.patients (created_at);

-- ───────── 접근 통제 (RLS) ─────────

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff s where s.id = auth.uid() and s.active)
$$;

create or replace function public.is_active_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff s where s.id = auth.uid() and s.active and s.role = 'doctor')
$$;

alter table public.staff enable row level security;
alter table public.rooms enable row level security;
alter table public.patients enable row level security;
alter table public.moves enable row level security;

-- 활성 직원: 보드 데이터 전체 읽기·쓰기
create policy "staff can read patients" on public.patients for select to authenticated using (public.is_active_staff());
create policy "staff can write patients" on public.patients for insert to authenticated with check (public.is_active_staff());
create policy "staff can update patients" on public.patients for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "staff can delete patients" on public.patients for delete to authenticated using (public.is_active_staff());

create policy "staff can read moves" on public.moves for select to authenticated using (public.is_active_staff());
create policy "staff can write moves" on public.moves for insert to authenticated with check (public.is_active_staff());

create policy "staff can read rooms" on public.rooms for select to authenticated using (public.is_active_staff());
create policy "staff can write rooms" on public.rooms for insert to authenticated with check (public.is_active_staff());
create policy "staff can update rooms" on public.rooms for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "staff can delete rooms" on public.rooms for delete to authenticated using (public.is_active_staff());

-- 직원 목록: 활성 직원은 읽기, 직원 추가·수정·퇴사 처리는 원장만
create policy "staff can read staff" on public.staff for select to authenticated using (public.is_active_staff());
create policy "doctor can add staff" on public.staff for insert to authenticated with check (public.is_active_doctor());
create policy "doctor can update staff" on public.staff for update to authenticated using (public.is_active_doctor()) with check (public.is_active_doctor());

-- ───────── 실시간 동기화 ─────────
alter publication supabase_realtime add table public.patients, public.moves, public.rooms;

-- ───────── 7일 지난 데이터 자동 삭제 ─────────
create or replace function public.purge_old_data()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.moves where at < now() - interval '7 days';
  delete from public.patients where created_at < now() - interval '7 days';  -- 연결된 moves도 함께 삭제됨
$$;

revoke all on function public.purge_old_data() from public, anon, authenticated;
