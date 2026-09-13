using UnrealBuildTool;

public class BridgePointHorizon : ModuleRules
{
    public BridgePointHorizon(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
            "GameplayTags",
            "GameplayAbilities",
            "GameplayTasks",
            "AIModule",
            "NavigationSystem",
            "OnlineSubsystem",
            "OnlineSubsystemUtils",
            "VoiceChat"
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "Slate",
            "SlateCore"
        });
    }
}
