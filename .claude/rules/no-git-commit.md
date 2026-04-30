rules/no-git-commit.md
---
description: git commit/push 절대 금지 규칙
paths:
---

# Git 규칙

- **git commit/push 절대 금지**: 사용자가 직접 관리하는 영역이므로 Claude는 커밋/푸시 작업을 수행하지 않는다
- `git diff`, `git log`, `git status`, `git blame`, `git show` 등 **읽기 전용 명령만 허용**