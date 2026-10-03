---
description: 직전 수업(또는 지정 내용)의 주장을 교재·PubMed로 검증
argument-hint: [검증할 내용 또는 비워두면 직전 수업]
---

대상: $ARGUMENTS (비어 있으면 직전 수업의 `audit-list`)

`evidence-auditor` 에이전트를 호출해 주장별 판정표(확인됨/부분적/틀림/확인 불가, 근거, 수정안)를 만들게 한다.
도구로 확인되지 않은 PMID·DOI는 쓰지 못하게 한다. 틀린 주장은 `progress/audit-log.md` 에 기록한다.
