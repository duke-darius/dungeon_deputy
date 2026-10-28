---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-10-28T11:34:31.328Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | src/main.tsx | 4 | React entry remains an intentional setup shell; dashboard/player UI is deferred to later Phase 1 plans. | open |  | 2026-10-28T11:34:31.328Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "01",
    "file": "src/main.tsx",
    "line": 4,
    "description": "React entry remains an intentional setup shell; dashboard/player UI is deferred to later Phase 1 plans.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-28T11:34:31.328Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
