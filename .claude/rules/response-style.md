---
description: Claude 답변 형식 규칙
paths:
---

# 답변 스타일

- 코드 관련 설명 시 **파일 경로와 라인 번호** 함께 표기 (예: `src/app/lib/api.ts:24`)
- import 경로는 alias(`@/components/Button/Button`) 또는 상대 경로 어느 쪽이든 — 코드베이스 실제 사용 형태에 맞춤

# 출력 절약

- 작업 예고("~를 하겠습니다") 금지 — 바로 실행
- 파일 전체 내용 출력 금지 — 변경 부분만
- 도구 호출 결과 재요약 금지
