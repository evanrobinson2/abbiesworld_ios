# Coordinator-reviewed integration deltas

Engine 5.4.4. Original AWRestaurantMode C++ gameplay source; dependencies Core, CoreUObject, Engine, InputCore, Slate, SlateCore, EngineSettings.

Add these two source files to the existing AbbiesWorld runtime module. Add EngineSettings to its Build.cs. Keep the existing module and project ownership with Mother Hen.

Canonical original content path: /Game/AbbiesRestaurant. Initial graybox setup uses installed Unreal BasicShapes and writes assets only to that path. Run create-graybox-assets.py in the coordinator’s isolated staging editor. This setup script and namespaced clean variant have not been compiled/run as a separate project yet; the source’s private reference variant has compiled. Preserve the private kit’s current package paths locally; do not migrate or copy it to this public project.

Restaurant menu action: UGameplayStatics::OpenLevel(Mode.Get(), FName(TEXT("/Engine/Maps/Entry")), true, TEXT("game=/Script/AbbiesWorld.AWRestaurantMode"));

Packaging settings require +DirectoriesToAlwaysCook=(Path="/Game/AbbiesRestaurant") under [/Script/UnrealEd.ProjectPackagingSettings]. Entry is already in the desktop project’s MapsToCook. Do not copy the desktop Config directory wholesale; it contains unrelated settings and potentially private fields.

Launch switches: -RestaurantPlayers=3 (1–4), -RestaurantHuman for co-op; omit it for live AI demo. -AWRestaurantSmokeTest writes Saved/KitchenServiceResult.json and exits at service end. -AWRestaurantProof captures Saved/Screenshots/KitchenProof.png at 12 simulation seconds.

Input: keyboard WASD/E/F/Space for player 0, gamepads stick/A/X/B for subsequent local players. Global gamepad offset enabled at runtime. Real device validation is pending. Touch/iPad, networking, skeletal animation, projectile throws and character swapping remain future work. Current throw action is a directional teammate handoff, not ballistic flight.

Graybox is a technical integration aid, not an approved appearance proof. Original assets from 3D Artist should replace these identities after explicit human review. No commercial media or derivatives belong in the public repository.
