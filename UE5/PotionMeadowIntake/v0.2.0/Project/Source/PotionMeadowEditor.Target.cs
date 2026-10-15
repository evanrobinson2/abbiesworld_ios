using UnrealBuildTool;
public class PotionMeadowEditorTarget : TargetRules
{
    public PotionMeadowEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("AbbiesWorld");
    }
}
