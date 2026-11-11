using UnrealBuildTool;

public class BridgePointEarth : ModuleRules
{
    public BridgePointEarth(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[]
        {
            "Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput",
            "HTTP", "Json", "JsonUtilities", "ImageWrapper", "ProceduralMeshComponent",
            "PCG", "PhysicsCore", "AudioMixer", "MetasoundEngine", "UMG", "Slate", "SlateCore"
        });
        PrivateDependencyModuleNames.AddRange(new[] { "DeveloperSettings" });
    }
}