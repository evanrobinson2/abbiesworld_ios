# Abbie’s World native Unreal app

The current Windows UE 5.4 project, developed on the repository’s UE5 line. Earlier static intakes remain in ../OverlandIntake/R2 for history.

Open AbbiesWorldPreview.uproject with UE 5.4. Build AbbiesWorldPreviewEditor (Win64 Development), then launch with -game. Generated builds, caches, and user saves are ignored.

Connect uses the registered Auth0 Windows native client, authorization-code PKCE, and https://abbies.world. Content/Data/identity.json contains only public client configuration; no client secret is required. Household API health and unauthenticated rejection were verified. Account sign-in was confirmed by the user. The separately prepared shared-universe backend still requires activation on the server.

Escape dismisses the tools drawer or resumes from a menu/settings overlay. Before a shared universe is joined, Escape or Close on the entry menu explicitly opens the local preview, so a universe-service failure cannot trap the player in the menu. F2 toggles settings. Orbit sensitivity defaults to 2x, ranges from 0.25x to 4x, and persists in local game-user settings. Runtime checks passed for drawer dismissal, settings open/close, menu resume, and preserving board position. Settings layout was visually inspected at 960x640.

The native Editor Development build passed. Packaged Windows and iOS builds have not been verified. Changes to native source should be made here, not in the previous generated preview directory.

## Remembered sign-in

The native client requests offline_access. The Windows native Auth0 application enables authorization_code and refresh_token; the API already permits offline access. Tokens are stored in Windows Credential Manager under the tenant/client identity, never in game files or Git. Startup restores the session and revalidates household profiles; background renewal replaces expired access tokens. Network failures retain saved sign-in. Logout clears local credentials, cancels stale callbacks, and attempts server-side refresh-token revocation. A subsequent explicit Connect requests a fresh provider login. Provider revocation can still require reauthorization.

Native credential lifecycle automation passed. Real-account sign-in, fresh-process restore without a new browser login, and forced refresh-token renewal passed. No real credentials are in the proof reports.

## Two perspectives and visual direction

V and the bottom Overland/Cinematic actions switch between navigation and close inspection of the selected tile or POI. The previous overview is restored, including its volumetric-fog state. Cinematic framing uses POI bounds with a generic tile fallback; authored views and high-detail cinematic replacement meshes remain pending. The compact dark HUD and pause menu are an initial native pass toward Design/approved-ui-art-direction.png, approved by the user.

Tools/restore_hero_materials.py restores missing normal and metallic/roughness channels from SourceAssets/HeroPBR/jobs.json. Seven imported building materials were repaired; three already had the channels connected. This is a material repair, not a claim that high-detail geometry has been rebuilt. The supplied bunker near mesh has 4,644 triangles; the handoff’s 1.8M-triangle master is unavailable locally. See Design/visual-contract.json and Design/hero-asset-audit.json for the planned hero/ultra-hero acceptance criteria.
