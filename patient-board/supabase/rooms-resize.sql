-- 회복실 II를 키우고(카드 2줄), 그 아래 방들을 11만큼 내린다. 서버에 저장된 방 크기·위치를 바꾸는 한 번만 실행하는 설정.
-- (설정 화면에서 직접 위치·크기를 바꾸셨다면 그 값이 덮어써집니다.)
update public.rooms set h = 196 where id = 'recov2';
update public.rooms set y = 622 where id = 'consult2';
update public.rooms set y = 828 where id = 'consult1';
update public.rooms set h = 293 where id = 'wait';
