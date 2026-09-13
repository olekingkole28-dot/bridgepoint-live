using UnrealBuildTool;
using System.Collections.Generic;

public class BridgePointHorizonEditorTarget : TargetRules
{
    public BridgePointHorizonEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("BridgePointHorizon");
    }
}
