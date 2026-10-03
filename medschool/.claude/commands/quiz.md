---
description: 문항 세트 출제 (예: /quiz 신장 생리 10문항 USMLE)
argument-hint: <범위> [문항수] [USMLE|JP]
---

범위: $ARGUMENTS

`examiner` 에이전트를 호출해 `.claude/agents/examiner.md` 규칙대로 오리지널 문항을 한 문항씩 출제하게 한다.
- 기본은 USMLE 스타일(영어), `JP` 지정 시 `coach-japan-jmle` 와 협력해 일본어.
- 매 문항 후 응답과 확신도(1~3)를 받고 해설한다.
- 종료 후 정답률, 오답 원인(K/R/M/C), 고확신 오답을 요약하고 `progress/` 를 갱신한다.
