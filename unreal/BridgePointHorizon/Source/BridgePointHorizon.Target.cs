using UnrealBuildTool;
using System.Collections.Generic;

public class BridgePointHorizonTarget : TargetRules
{
    public BridgePointHorizonTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("BridgePointHorizon");
    }
}
