-- 직원 프로필 만들기. 순서:
-- 1) Supabase 왼쪽 메뉴 Authentication → Users → Add user → Create new user 로 직원마다 이메일·비밀번호 계정을 만든다.
--    (비밀번호는 직원 본인만 알도록 임시 비밀번호를 만든 뒤 각자 바꾸게 한다.)
-- 2) 아래의 이메일을 실제 이메일로 바꾸고 SQL Editor에서 실행한다.
insert into public.staff (id, name, role)
select u.id, v.name, v.role
from (values
  ('원장 이메일을 여기에',          '원장',     'doctor'),
  ('박유빈 이메일을 여기에',        '박유빈',   'coordinator'),
  ('김도은 이메일을 여기에',        '김도은',   'coordinator'),
  ('정선영 이메일을 여기에',        '정선영',   'manager'),
  ('백원경 이메일을 여기에',        '백원경',   'nurse'),
  ('이소미 이메일을 여기에',        '이소미',   'nurse'),
  ('이채영 이메일을 여기에',        '이채영',   'nurse')
) as v(email, name, role)
join auth.users u on u.email = v.email
on conflict (id) do nothing;

-- 퇴사 처리 예시 (계정은 남기되 즉시 보드 접근 불가):
-- update public.staff set active = false where name = '홍길동';
-- 로그인 자체도 막으려면 Authentication → Users에서 해당 사용자를 Ban 하거나 삭제한다.
