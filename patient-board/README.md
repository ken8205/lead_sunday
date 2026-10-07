# 페이스플러스 환자 동선 보드

병원 평면도 위에서 환자 카드를 방으로 옮겨, 지금 누가 어느 방에 있는지 보는 웹앱 (병원 내부 전용 시제품).
기획서는 `SPEC.md`, 보류 중인 아이디어는 `NOTES.md`.

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 타입 검사 + 배포용 빌드 (dist/)
npm run preview  # 빌드 결과 미리 보기
```

## 화면

- **보드**: 평면도 + 환자 카드, 오른쪽 "호출 대기" 목록 (원장/실장/간호사/코디). 카드는 탭 후 방 탭, 또는 드래그로 이동.
- **원장 보기**: 원장 대기 환자를 맨 위에, 그다음 방별 목록 (폰용, 읽기 전용).
- **설정**: 대기 강조 기준(분), 방 이름·종류·추가·삭제·위치.

## 서버 모드 (7단계: 로그인 + 실시간 공유)

환경 변수 두 개가 있으면 **서버 모드**, 없으면 아래의 "이 브라우저 전용 모드"로 동작합니다.

```
VITE_SUPABASE_URL=https://<프로젝트>.supabase.co        # /rest/v1/ 같은 뒷부분 없이
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...       # 공개용 키만. secret/service_role 키는 절대 넣지 않음
```

- Supabase 준비: `supabase/schema.sql` → `supabase/schema-2.sql` → `supabase/schedule-purge.sql` → `supabase/create-staff.sql` 순서로 SQL Editor에서 실행.
- 서버 모드에서는 로그인(직원 개인 계정)이 필요하고, 카드·이동 기록·방·"먼저 볼 순서"가 모든 기기에 실시간(15초 안전망 포함) 공유됩니다.
- 퇴사 처리: `staff.active = false`로 바꾸면 1분 안에 보드 접근이 막힙니다.
- 서버 모드에서는 "예시 채우기/모두 비우기"가 숨겨집니다 (실제 데이터를 지우지 않도록).
- 7일이 지난 카드와 이동 기록은 서버에서 매일 새벽 4시(한국 시간) 자동 삭제됩니다.

## 이 브라우저 전용 모드 (환경 변수 없음)

1~6단계 시제품은 **서버 없이 이 브라우저의 localStorage에만 저장**합니다.
기기끼리 동기화되지 않고, 로그인도 없습니다. 실제 환자 정보(이름, 생년월일, 수술명)는
7단계(직원별 로그인 + 서버 저장 + 접근 통제)를 붙이기 전에는 넣지 마세요.

## 홈 화면에 추가 (PWA)

`manifest.webmanifest`, 아이콘, 서비스 워커(`public/sw.js`)가 포함되어 있습니다.
HTTPS로 배포하면 폰/태블릿 브라우저 메뉴의 "홈 화면에 추가"로 앱처럼 열 수 있습니다.
서비스 워커는 네트워크 우선이라, 새 버전을 배포하면 다음 접속 때 바로 바뀝니다.

## 배포 (Vercel)

이 저장소에는 기존 앱(Next.js, 저장소 루트)과 이 앱(`patient-board`)이 함께 있어서, **Vercel 프로젝트를 앱마다 따로** 만듭니다.

1. Vercel에서 New Project → 이 저장소 Import.
2. **Root Directory**: `patient-board`, **Framework Preset**: Vite (빌드 `npm run build`, 출력 `dist`).
3. **Environment Variables** (Production, Preview, Development 모두):
   - `VITE_SUPABASE_URL` = Supabase 프로젝트 주소 (`https://<프로젝트>.supabase.co`, 뒤에 `/rest/v1/` 없이)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = 공개용 키 (`sb_publishable_...`). secret/service_role 키는 절대 넣지 않음.
4. Production은 `main` 브랜치를 따라갑니다. 프로젝트를 만든 직후에는 배포가 없고, `main`에 새 변경이 올라와야 첫 배포가 시작됩니다.
5. 배포된 주소를 열면 로그인 화면이 나옵니다. 환경 변수가 없으면 로그인 없는 "이 브라우저 전용 모드"로 열리므로, 실환자 정보를 넣기 전에 반드시 로그인 화면이 나오는지 확인하세요.

환경 변수를 바꾸면 **Redeploy**해야 반영됩니다.

> 기존 앱(`lead-sunday` 프로젝트)의 배포는 해당 앱의 DB 연결 문제로 실패 중입니다(2026-10 기준). `patient-board`와 무관합니다.

## 다음 단계 (7단계, 정해야 할 것)

- Supabase(또는 Firebase) 실시간 동기화, 직원별 개인 계정 로그인
- 데이터 위치(한국 리전 가능 여부), 이동 기록 보관 기간, 실사용 환자 정보 기준
