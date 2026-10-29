---
schema_version: 1
open_count: 5
waived_count: 0
fixed_count: 0
total_count: 5
last_updated: 2026-10-29T19:18:55.111Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | src/main.tsx | 4 | React entry remains an intentional setup shell; dashboard/player UI is deferred to later Phase 1 plans. | open |  | 2026-10-28T11:34:31.328Z |  |
| 2 | 01 | deviation | src/backend/Program.cs |  | Renderer-to-backend direct HTTP was replaced with sender-checked IPC and per-run token authentication. | open |  | 2026-10-28T11:54:19.596Z |  |
| 3 | 01 | deviation | src/main.ts |  | Corrected Forge backend and renderer resource paths to match assembled resource directory names. | open |  | 2026-10-28T11:54:19.947Z |  |
| 4 | 03 | stub | src/renderer/src/map/MapCanvas.tsx |  | The fog overlay omits source terrain and does not render revealed terrain safely. | open |  | 2026-10-29T19:18:54.793Z |  |
| 5 | 03 | unrun-verify | src/renderer/src/map/MapCanvas.tsx |  | Brush-specific pointer cancel, mode-change cleanup, and pan/token drag isolation tests were not implemented. | open |  | 2026-10-29T19:18:55.111Z |  |

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
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "01",
    "file": "src/backend/Program.cs",
    "line": null,
    "description": "Renderer-to-backend direct HTTP was replaced with sender-checked IPC and per-run token authentication.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-28T11:54:19.596Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "01",
    "file": "src/main.ts",
    "line": null,
    "description": "Corrected Forge backend and renderer resource paths to match assembled resource directory names.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-28T11:54:19.947Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 4,
    "kind": "stub",
    "phase": "03",
    "file": "src/renderer/src/map/MapCanvas.tsx",
    "line": null,
    "description": "The fog overlay omits source terrain and does not render revealed terrain safely.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-29T19:18:54.793Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "src/renderer/src/map/MapCanvas.tsx",
    "line": null,
    "description": "Brush-specific pointer cancel, mode-change cleanup, and pan/token drag isolation tests were not implemented.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-29T19:18:55.111Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
