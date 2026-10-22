# Midjourney — use execution capacity (pull)

Prefer:

- Doc: `/Users/evanrobinson/abbies.world.ios/docs/architecture/EXECUTION_CAPACITY.md`
- Start (Mac): `/Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh start`
- Start (Windows): `.\scripts\execution_capacity.ps1 start`
- Windows installer zip: `./scripts/build_execution_capacity_windows_installer.sh` → extract on the PC and run `Install.ps1`
- Local submit: same scripts with `submit "<prompt>"`
- Cloud (ChatGPT): MCP `midjourney_fill` → Mac or Windows worker **pulls** the job (no tunnel)

## Legacy fill-only

`/Users/evanrobinson/abbies.world.ios/scripts/mj_local_bridge.sh wait-fill "…"` types only — no queue, no harvest.
