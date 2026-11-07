# Phase 5 Validation

## Source gate

The official SRD 5.2.1 PDF SHA-256 was checked against the pinned manifest value. Seven sample records were directly compared with the official PDF at their cited pages: spell p.107, condition/action p.177, class p.28, species p.84, equipment p.91, and monster p.261. This validates the seven-category minimum sample only; it does not establish SRD completeness or parity.

## Commands and scope

Run `npm test`, `npm run build`, `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release`, `npm run package:smoke`, and `npm run test:e2e`. Record pass/fail and platform here after execution. The package smoke checks bundled resource resolution and local API operation; it does not itself enforce outbound network denial. Physical Windows/macOS hardware acceptance is unverified unless separately recorded.

## Execution results

- PDF SHA-256 matches the pinned manifest. All seven category samples were directly inspected in the source PDF at the citations listed above.
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` — PASS, 23 tests.
- `npm test` — PASS, 79 Node tests and 23 .NET tests, including DM IPC path allowlist tests for the SRD catalog routes.
- `npm run build` — PASS; TypeScript/Electron/Vite and .NET Release build, zero backend warnings/errors.
- `npm run package:smoke` — PASS on Windows x64. Packaged local catalog search, monster add, private actor restart persistence, map/public isolation, authenticated map round-trip, and black-until-Show passed.
- `npm run test:e2e` — PASS on Windows x64; final evidence: `artifacts/e2e/2026-10-31T12-44-46.415Z-dcd73bc2/`. Covers the DM Compendium search/detail, visible license/provenance and explicit Bandit Add; asserts the new actor is persisted privately and map/public presentation remain unchanged. Also includes the Phase 4 mobile-layout regression fix; audio workspace fits the 390px viewport.
- Outbound network denial was not enforced by firewall; package smoke verifies local bundled catalog behavior and no remote fallback in the catalog runtime, not OS-level network isolation.
