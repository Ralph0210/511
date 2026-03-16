---
name: No PDF commits
description: PDF supporting documents should never be committed to the repository
type: feedback
---

Do not commit PDF files to the repo — they are supporting docs only.

**Why:** PDFs are reference/supporting documents, not part of the codebase. They bloat the repo.

**How to apply:** Ensure `*.pdf` is in `.gitignore`. Never stage or commit PDF files.
