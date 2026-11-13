#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "BridgePointGeoReference.h"
#include "BridgePointMVTDecoder.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBridgePointGeoReferenceRoundTrip,
    "BridgePoint.Earth.GeoReference.LocalRoundTrip",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointGeoReferenceRoundTrip::RunTest(const FString& Parameters)
{
    constexpr double OriginLon=-72.65;
    constexpr double OriginLat=41.56;
    const FVector2D Local=FBridgePointGeoReference::ToLocalMeters(-72.649,41.561,OriginLon,OriginLat);
    const FVector2D Geo=FBridgePointGeoReference::LocalMetersToGeo(Local.X,Local.Y,OriginLon,OriginLat);
    TestTrue(TEXT("Longitude round-trip remains within a centimetre"),FMath::Abs(Geo.X-(-72.649))<1.0e-6);
    TestTrue(TEXT("Latitude round-trip remains within a centimetre"),FMath::Abs(Geo.Y-41.561)<1.0e-6);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBridgePointTileBounds,
    "BridgePoint.Earth.GeoReference.TileBounds",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointTileBounds::RunTest(const FString& Parameters)
{
    const FBPGeoTileKey Tile=FBridgePointGeoReference::TileForLocation(0.0,0.0,8);
    const FBPGeoBounds Bounds=FBridgePointGeoReference::BoundsForTile(Tile);
    TestTrue(TEXT("Equator tile contains zero latitude"),Bounds.South<=0.0 && Bounds.North>=0.0);
    TestTrue(TEXT("Prime meridian tile contains zero longitude"),Bounds.West<=0.0 && Bounds.East>=0.0);
    TestTrue(TEXT("Tile bounds have positive area"),Bounds.East>Bounds.West && Bounds.North>Bounds.South);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBridgePointMVTRejectsEmpty,
    "BridgePoint.Earth.MVT.EmptyTileRejected",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointMVTRejectsEmpty::RunTest(const FString& Parameters)
{
    TArray<uint8> Empty;
    TArray<FBPGeoFeature> Features;
    FString Error;
    const bool bDecoded=FBridgePointMVTDecoder::Decode(Empty,FBPGeoTileKey(),Features,Error);
    TestFalse(TEXT("Empty PBF payload is not a valid vector tile"),bDecoded);
    TestFalse(TEXT("Decoder reports an error for empty PBF payload"),Error.IsEmpty());
    return true;
}

#endif