# Phase 5: Offline SRD Compendium

## Verified subset and source

The application bundles a deliberately small, curated subset from the official English System Reference Document 5.2.1 PDF. One individually cited record is included for each of the seven minimum categories: spell, condition, action, monster, equipment, class, and species. These records were checked against the source PDF; this is not an item-by-item review of the SRD and no completeness or parity claim is made. Class and species records are partial definitions, not character-builder data. Unreviewed records are unavailable.

The source PDF is identified in `assets/srd/2024/manifest.json`; the expected PDF SHA-256 is `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`. The official PDF contains the required attribution reproduced verbatim in `assets/srd/2024/attribution.md`. The bundled structured records are attributed to SRD 5.2.1 and licensed CC-BY-4.0; selected fields were reorganized/transcribed, and omitted content is not implied to be covered. No endorsement is implied.

Verify the source file and manifest hash in PowerShell:

```powershell
Get-FileHash assets/srd/2024/source/SRD_CC_v5.2.1.pdf -Algorithm SHA256
Get-Content assets/srd/2024/manifest.json
```

## Offline demo

1. Start the desktop app and open the DM Compendium workspace.
2. Select **Monsters**, search for **Bandit**, and inspect its source citation and stat block.
3. Choose **Add** and confirm the explicit private-encounter prompt.
4. Verify the Bandit appears in the encounter and map-token count/public presentation remain unchanged. Restart the backend/app and confirm the actor remains in private encounter state.

Catalog APIs read the bundled `assets/srd/2024` files copied beside the backend; there is no remote catalog fallback. Package smoke validates those resource files, searches and adds the bundled Bandit using the packaged backend, and checks that Add does not affect map or public presentation.

## Validation commands

```powershell
npm test
npm run build
dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release
npm run package:smoke
npm run test:e2e
```

`npm run package:smoke` is platform-dependent. On this execution host, Windows x64 package validation is the only platform claim; macOS x64/arm64 packaging, hardware/display workflows, and physical offline firewall enforcement have not been verified. The smoke uses the packaged local backend and does not configure a network-denial firewall, so it proves catalog resolution from bundled files, not OS-level network isolation.

## Known gaps

- Only the seven individually reviewed sample records are searchable; no full-SRD completeness claim is made.
- No character-calculation or LAN behavior is included.
- No physical platform/hardware acceptance is claimed beyond automated checks run on the current Windows host.
