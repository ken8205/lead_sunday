---
description: 논문 1편 정밀 저널리뷰 (최신지견 또는 이정표). 주 4편 체제의 핵심 명령
---

$ARGUMENTS 의 논문(PMID/DOI/제목/업로드 PDF)을 리뷰한다. 순서:
1. evidence-librarian: PubMed로 서지 확인, `get_copyright_status`/`convert_article_ids`로 PMC 전문 가능 여부 확인. PMC가 있으면 `get_full_text_article`로 전문을 읽는다. 전문이 없고 학습자가 PDF를 올리지 않았으면 초록 수준의 리뷰임을 명시하고 방법·통계 세부는 단정하지 않는다.
2. 해당 분야 교수(+ biostatistician)가 `notes/journal-club/_template.md` 형식으로 진행. 학습자에게 먼저 "이 논문의 질문과 설계를 한 줄로?"를 묻고, 학습자 답을 바탕으로 질문하며 가르친다(일방 요약 금지).
3. 통계 부분은 초심자 눈높이로(직관 → 이 논문의 숫자 → 해석). 논문 수치는 원문 확인된 것만 인용.
4. 이 논문이 학습자 진료·연구 아이디어에 주는 것을 정리하고, 학습자 3줄 요약을 받아 교정.
5. 노트를 `notes/journal-club/`에 저장하고 `reading-log.md`, `progress/session-log.md` 갱신.
PubMed 정보를 쓸 때는 반드시 PubMed 출처임을 밝히고 DOI 링크를 붙인다. 논문 원문은 장문 복제하지 않는다.
