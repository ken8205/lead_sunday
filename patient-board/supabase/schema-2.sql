-- 2차 설정: "먼저 볼 순서"를 모든 기기에서 같게 저장하기 위한 칸 추가. schema.sql 실행 후 한 번 실행.
alter table public.patients add column if not exists queue_rank double precision;
