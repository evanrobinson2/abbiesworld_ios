# Abbie’s World native Unreal app

The current Windows UE 5.4 project, developed on the repository’s UE5 line. Earlier static intakes remain in ../OverlandIntake/R2 for history.

Open AbbiesWorldPreview.uproject with UE 5.4. Build AbbiesWorldPreviewEditor (Win64 Development), then launch with -game. Generated builds, caches, and user saves are ignored.

Connect uses the registered Auth0 Windows native client, authorization-code PKCE, and https://abbies.world. Content/Data/identity.json contains only public client configuration; no client secret is required. Household API health and unauthenticated rejection were verified. Account sign-in was confirmed by the user. The separately prepared shared-universe backend still requires activation on the server.

Escape dismisses the tools drawer or resumes from a menu/settings overlay. Before a shared universe is joined, Escape or Close on the entry menu explicitly opens the local preview, so a universe-service failure cannot trap the player in the menu. F2 toggles settings. Orbit sensitivity defaults to 2x, ranges from 0.25x to 4x, and persists in local game-user settings. Runtime checks passed for drawer dismissal, settings open/close, menu resume, and preserving board position. Settings layout was visually inspected at 960x640.

The native Editor Development build passed. Packaged Windows and iOS builds have not been verified. Changes to native source should be made here, not in the previous generated preview directory.
