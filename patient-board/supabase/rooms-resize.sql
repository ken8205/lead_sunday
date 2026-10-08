-- 방 크기·위치를 기본 배치로 맞춘다(한 번만 실행).
--  - 회복실 II: 원래 크기(180)
--  - 상담실 II / 촬영실: 작게(150), 상담실 I: 크게(242). 아래 끝은 대기실과 맞춤
-- 설정 화면에서 이 방들의 위치·크기를 직접 바꾸셨다면 그 값이 덮어써집니다.
update public.rooms set h = 180 where id = 'recov2';
update public.rooms set y = 611, h = 150 where id = 'consult2';
update public.rooms set y = 771, h = 242 where id = 'consult1';
update public.rooms set y = 731, h = 282 where id = 'wait';
