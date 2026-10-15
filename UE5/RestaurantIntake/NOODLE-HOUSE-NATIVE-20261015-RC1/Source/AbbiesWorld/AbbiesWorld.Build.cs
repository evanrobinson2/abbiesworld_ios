using UnrealBuildTool;
public class AbbiesWorld : ModuleRules
{
    public AbbiesWorld(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[] {"Core", "CoreUObject", "Engine", "InputCore", "EngineSettings", "Slate", "SlateCore", "MediaAssets", "AudioMixer", "RenderCore", "RHI", "Json", "JsonUtilities"});
    }
}
