# Marble Voyage opening

The book's “Begin voyage” action unlocks Marble Voyage, then presents `VoyageOpeningView`. World-switcher and world-teleporter entries use the same gate. The destination is entered only when the movie finishes, or when an eligible returning viewer taps Skip intro.

The saved player progression milestone `marbleVoyage.opening.watched.v1` is awarded only after the cutscene reports its end. An interrupted first viewing starts again next entry. The milestone uses the existing player-state persistence/sync path; it is not a device-wide preference. First view has no skip, scrub, chapter, or swipe-dismiss controls. Repeat view offers Skip intro. Loading errors offer Retry without awarding completion.

The review remains editable at `web/rescue-cut.html`. Run `python3 scripts/package_voyage_opening.py` from the repository root after editing it. The packager copies only referenced artwork and the licensed Roboto font into `Resources/VoyageOpening.bundle`, flattens modules for local WebKit loading, removes review navigation, autoplays, and connects the end-of-story event to Swift. No localhost or network connection is needed in the game. Native SwiftUI hosts the same browser renderer, not a separate SpriteKit rendition. Narration and native particle effects remain future work.

The revised story adds scene-specific pen annotations, an offscreen rock/bonk, Abbie's reveal, Fox's escape, and a continuing quest for Bramble. The obstructing departure inset is removed. Existing canonical portraits and generated source panels are reused; no new throw-pose artwork was generated.

Verification: app simulator build; VoyageOpeningTests cover first-view/return-view/player identity rules, save serialization, actual offline WebKit loading and bundled font, all 13 scene mounts, and a single completion callback. These do not replace a full visual playthrough of the teleporter UI.
