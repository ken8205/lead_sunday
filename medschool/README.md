# MedSchool — 평생 의학 커리큘럼

신입 의대생의 마음으로 처음부터 시작해 USMLE(Step 1 → Step 2 CK → 선택적 Step 3)와
일본 의사국가시험(医師国家試験) 수준까지 도달하기 위한 장기 학습 시스템.

> 이 폴더는 `lead_sunday` 앱과 무관합니다. 편의상 같은 브랜치에 두었으며,
> 나중에 별도 저장소로 그대로 옮겨도 됩니다(`medschool/` 폴더째 이동).
> **Claude Code는 반드시 `medschool/` 안에서 실행하세요** (에이전트·명령어 인식 경로).

## 먼저 읽을 것
1. `PLAN.md` — 전체 계획, 주당 시간, 일정, 시험 목표
2. `CLAUDE.md` — 이 학교의 규칙(근거 원칙, 수업 프로토콜)
3. `exams/` — USMLE / 일본 국시 정보와 **확인 필요 목록**

## 시작 순서
1. `curriculum/00-diagnostic.md`의 진단 테스트를 풉니다(정답은 파일 끝, 보지 말고).
2. `/status` 로 진도판을 확인하고 `/lesson` 으로 첫 수업을 시작합니다.

## 슬래시 명령어 (`.claude/commands/`)
| 명령 | 기능 |
|---|---|
| `/lesson <주제>` | 해당 분야 교수가 정식 수업(사전독서 지정 → 심화강의 → 증례 → 회상퀴즈) |
| `/quiz <범위>` | USMLE/국시 스타일 문항 세트 출제 및 채점 |
| `/review` | 오늘 복습할 항목(간격반복)과 오답노트 점검 |
| `/audit <내용>` | 근거 감사관이 직전 수업 내용을 교재·PubMed와 대조 |
| `/status` | 진도·정답률·다음 할 일 |

## 에이전트 (`.claude/agents/`)
- 운영: `dean`, `evidence-auditor`, `examiner`, `update-scout`
- 기초 교수진(9): `prof-molecular-genetics`, `prof-biochemistry`, `prof-anatomy-embryology`,
  `prof-physiology`, `prof-pathology`, `prof-pharmacology`, `prof-immuno-micro`,
  `prof-neuroscience`, `prof-biostat-ethics`
- 시험 코치: `coach-usmle`, `coach-japan-jmle`
- 임상 교수진(3단계에서 추가): `PLAN.md` §6 참조

에이전트는 실제 인물이 아니라 **"세계 최상위 의대 교수의 역할과 교수법"을 따르는 AI 튜터**입니다.
실존 교수를 사칭하지 않습니다.
