-- 매일 새벽 4시(한국 시간)에 7일 지난 데이터를 지운다. (19:00 UTC = 04:00 KST)
-- schema.sql을 실행한 뒤에 실행한다.
-- 오류가 나면: Supabase 왼쪽 메뉴 Database → Extensions에서 pg_cron을 켠 뒤 다시 실행.
create extension if not exists pg_cron;
select cron.schedule('purge-old-data', '0 19 * * *', $$select public.purge_old_data()$$);
