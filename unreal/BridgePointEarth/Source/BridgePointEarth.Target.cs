using UnrealBuildTool;
using System.Collections.Generic;

public class BridgePointEarthTarget : TargetRules
{
    public BridgePointEarthTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_5;
        ExtraModuleNames.Add("BridgePointEarth");
    }
}