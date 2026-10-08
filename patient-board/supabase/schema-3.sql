-- 3차 설정 (한 번 실행): '퇴원대기' 상태 허용 + 방 이름 변경(탈의실 → 회복실3).
-- 반드시 앱을 새 버전으로 반영(PR 병합)하기 전에 먼저 실행한다.

-- 1) 상태 값 검사 규칙을 새로 만든다. (이름이 달라도 찾을 수 있도록 'waiting'이 들어간 검사 규칙을 찾아 지운다)
do $$
declare r record;
begin
  for r in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.patients'::regclass, 'public.moves'::regclass)
      and pg_get_constraintdef(oid) like '%waiting%'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.patients
  add constraint patients_status_check check (status in ('waiting', 'ready', 'in_progress', 'discharge', 'left'));
alter table public.moves
  add constraint moves_status_check check (status in ('waiting', 'ready', 'in_progress', 'discharge', 'left'));

-- 2) 방 이름 변경
update public.rooms set name = '회복실3' where id = 'dressing';
