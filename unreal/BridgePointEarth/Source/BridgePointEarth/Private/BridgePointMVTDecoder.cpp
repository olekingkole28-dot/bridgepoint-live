#include "BridgePointMVTDecoder.h"

namespace
{
    struct FProtoReader
    {
        const uint8* Data = nullptr;
        int32 Size = 0;
        int32 Position = 0;

        bool ReadVarint(uint64& Out)
        {
            Out = 0;
            int32 Shift = 0;
            while (Position < Size && Shift <= 63)
            {
                const uint8 Byte = Data[Position++];
                Out |= static_cast<uint64>(Byte & 0x7f) << Shift;
                if ((Byte & 0x80) == 0) return true;
                Shift += 7;
            }
            return false;
        }
        bool ReadBytes(const uint8*& OutData, int32& OutSize)
        {
            uint64 Length = 0;
            if (!ReadVarint(Length) || Length > static_cast<uint64>(Size - Position)) return false;
            OutSize = static_cast<int32>(Length);
            OutData = Data + Position;
            Position += OutSize;
            return true;
        }
        bool Skip(int32 WireType)
        {
            uint64 Ignored = 0;
            const uint8* Bytes = nullptr;
            int32 Length = 0;
            switch (WireType)
            {
                case 0: return ReadVarint(Ignored);
                case 1: if (Position + 8 > Size) return false; Position += 8; return true;
                case 2: return ReadBytes(Bytes, Length);
                case 5: if (Position + 4 > Size) return false; Position += 4; return true;
                default: return false;
            }
        }
    };

    static FString Utf8String(const uint8* Bytes, int32 Length)
    {
        FUTF8ToTCHAR Converted(reinterpret_cast<const ANSICHAR*>(Bytes), Length);
        return FString(Converted.Length(), Converted.Get());
    }

    static int64 ZigZag(uint64 Value)
    {
        return static_cast<int64>((Value >> 1) ^ (~(Value & 1) + 1));
    }

    static bool ReadPackedVarints(const uint8* Bytes, int32 Length, TArray<uint64>& Out)
    {
        FProtoReader R{Bytes, Length, 0};
        while (R.Position < R.Size)
        {
            uint64 Value = 0;
            if (!R.ReadVarint(Value)) return false;
            Out.Add(Value);
        }
        return true;
    }

    static bool ParseValue(const uint8* Bytes, int32 Length, FString& OutValue)
    {
        FProtoReader R{Bytes, Length, 0};
        while (R.Position < R.Size)
        {
            uint64 Tag = 0;
            if (!R.ReadVarint(Tag)) return false;
            const int32 Field = static_cast<int32>(Tag >> 3);
            const int32 Wire = static_cast<int32>(Tag & 7);
            if (Field == 1 && Wire == 2)
            {
                const uint8* S = nullptr; int32 L = 0;
                if (!R.ReadBytes(S, L)) return false;
                OutValue = Utf8String(S, L);
            }
            else if ((Field == 2 && Wire == 5) || (Field == 3 && Wire == 1))
            {
                if (Wire == 5)
                {
                    if (R.Position + 4 > R.Size) return false;
                    float V = 0; FMemory::Memcpy(&V, R.Data + R.Position, 4); R.Position += 4;
                    OutValue = FString::SanitizeFloat(V);
                }
                else
                {
                    if (R.Position + 8 > R.Size) return false;
                    double V = 0; FMemory::Memcpy(&V, R.Data + R.Position, 8); R.Position += 8;
                    OutValue = FString::SanitizeFloat(V);
                }
            }
            else if ((Field == 4 || Field == 5 || Field == 6 || Field == 7) && Wire == 0)
            {
                uint64 V = 0; if (!R.ReadVarint(V)) return false;
                if (Field == 6) OutValue = LexToString(ZigZag(V));
                else if (Field == 7) OutValue = V != 0 ? TEXT("true") : TEXT("false");
                else OutValue = LexToString(V);
            }
            else if (!R.Skip(Wire)) return false;
        }
        return true;
    }

    struct FMVTFeature
    {
        int64 Id = INDEX_NONE;
        uint32 Type = 0;
        TArray<uint64> Tags;
        TArray<uint64> Geometry;
    };

    static bool ParseFeature(const uint8* Bytes, int32 Length, FMVTFeature& Out)
    {
        FProtoReader R{Bytes, Length, 0};
        while (R.Position < R.Size)
        {
            uint64 Tag = 0; if (!R.ReadVarint(Tag)) return false;
            const int32 Field = static_cast<int32>(Tag >> 3), Wire = static_cast<int32>(Tag & 7);
            if (Field == 1 && Wire == 0)
            {
                uint64 V = 0; if (!R.ReadVarint(V)) return false; Out.Id = static_cast<int64>(V);
            }
            else if ((Field == 2 || Field == 4) && Wire == 2)
            {
                const uint8* P = nullptr; int32 N = 0; if (!R.ReadBytes(P, N)) return false;
                if (!ReadPackedVarints(P, N, Field == 2 ? Out.Tags : Out.Geometry)) return false;
            }
            else if (Field == 3 && Wire == 0)
            {
                uint64 V = 0; if (!R.ReadVarint(V)) return false; Out.Type = static_cast<uint32>(V);
            }
            else if (!R.Skip(Wire)) return false;
        }
        return true;
    }

    static bool ParseLayer(const uint8* Bytes, int32 Length, const FBPGeoTileKey& Tile, TArray<FBPGeoFeature>& Out)
    {
        FString LayerName;
        TArray<FMVTFeature> Features;
        TArray<FString> Keys;
        TArray<FString> Values;
        uint32 Extent = 4096;

        FProtoReader R{Bytes, Length, 0};
        while (R.Position < R.Size)
        {
            uint64 Tag = 0; if (!R.ReadVarint(Tag)) return false;
            const int32 Field = static_cast<int32>(Tag >> 3), Wire = static_cast<int32>(Tag & 7);
            if ((Field == 1 || Field == 2 || Field == 3 || Field == 4) && Wire == 2)
            {
                const uint8* P = nullptr; int32 N = 0; if (!R.ReadBytes(P, N)) return false;
                if (Field == 1) LayerName = Utf8String(P, N);
                else if (Field == 2)
                {
                    FMVTFeature F; if (!ParseFeature(P, N, F)) return false; Features.Add(MoveTemp(F));
                }
                else if (Field == 3) Keys.Add(Utf8String(P, N));
                else
                {
                    FString V; if (!ParseValue(P, N, V)) return false; Values.Add(MoveTemp(V));
                }
            }
            else if (Field == 5 && Wire == 0)
            {
                uint64 V = 0; if (!R.ReadVarint(V)) return false; Extent = static_cast<uint32>(FMath::Max<uint64>(1, V));
            }
            else if (!R.Skip(Wire)) return false;
        }

        const double N = FMath::Pow(2.0, Tile.Zoom);
        for (const FMVTFeature& F : Features)
        {
            FBPGeoFeature Feature;
            Feature.SourceLayer = LayerName;
            Feature.SourceId = F.Id;
            Feature.GeometryType = F.Type == 1 ? EBPGeometryType::Point : (F.Type == 2 ? EBPGeometryType::LineString : (F.Type == 3 ? EBPGeometryType::Polygon : EBPGeometryType::Unknown));
            for (int32 I = 0; I + 1 < F.Tags.Num(); I += 2)
            {
                const int32 KeyIndex = static_cast<int32>(F.Tags[I]);
                const int32 ValueIndex = static_cast<int32>(F.Tags[I + 1]);
                if (Keys.IsValidIndex(KeyIndex) && Values.IsValidIndex(ValueIndex))
                    Feature.Properties.Add(FName(*Keys[KeyIndex]), Values[ValueIndex]);
            }
            const FString Height = Feature.Properties.FindRef(TEXT("render_height_m")).IsEmpty()
                ? Feature.Properties.FindRef(TEXT("height")) : Feature.Properties.FindRef(TEXT("render_height_m"));
            if (!Height.IsEmpty())
            {
                const float Parsed = FCString::Atof(*Height);
                if (Parsed > 0.0f && FMath::IsFinite(Parsed)) Feature.HeightMeters = Parsed;
            }
            FString BaseHeight = Feature.Properties.FindRef(TEXT("render_min_height"));
            if (BaseHeight.IsEmpty()) BaseHeight = Feature.Properties.FindRef(TEXT("base_height_m"));
            if (BaseHeight.IsEmpty()) BaseHeight = Feature.Properties.FindRef(TEXT("min_height"));
            if (!BaseHeight.IsEmpty())
            {
                const float Parsed = FCString::Atof(*BaseHeight);
                if (Parsed >= 0.0f && FMath::IsFinite(Parsed)) Feature.BaseHeightMeters = Parsed;
            }

            FString RoofHeight = Feature.Properties.FindRef(TEXT("roof_height_m"));
            if (RoofHeight.IsEmpty()) RoofHeight = Feature.Properties.FindRef(TEXT("roof_height"));
            if (RoofHeight.IsEmpty()) RoofHeight = Feature.Properties.FindRef(TEXT("roof:height"));
            if (!RoofHeight.IsEmpty())
            {
                const float Parsed = FCString::Atof(*RoofHeight);
                if (Parsed >= 0.0f && FMath::IsFinite(Parsed)) Feature.RoofHeightMeters = Parsed;
            }

            // The dedicated BridgePoint roof tile publishes an absolute roof base/top pair.
            // Convert that pair to a base-relative extrusion while preserving both source keys.
            FString RoofBase = Feature.Properties.FindRef(TEXT("roof_base_m"));
            FString RoofTop = Feature.Properties.FindRef(TEXT("roof_top_m"));
            if (!RoofBase.IsEmpty() && !RoofTop.IsEmpty())
            {
                const float Base = FCString::Atof(*RoofBase);
                const float Top = FCString::Atof(*RoofTop);
                if (FMath::IsFinite(Base) && FMath::IsFinite(Top) && Base >= 0.0f && Top > Base)
                {
                    Feature.BaseHeightMeters = Base;
                    Feature.HeightMeters = Top - Base;
                }
            }
            const FString Width = Feature.Properties.FindRef(TEXT("width"));
            if (!Width.IsEmpty())
            {
                const float Parsed = FCString::Atof(*Width);
                if (Parsed > 0.0f && FMath::IsFinite(Parsed)) Feature.WidthMeters = Parsed;
            }

            int64 CursorX = 0, CursorY = 0;
            TArray<FVector2D> CurrentPath;
            auto FlushPath = [&]()
            {
                if (CurrentPath.Num() > 0)
                {
                    FBPGeoPath NewPath;
                    NewPath.Points=MoveTemp(CurrentPath);
                    Feature.Paths.Add(MoveTemp(NewPath));
                }
                CurrentPath.Reset();
            };
            int32 G = 0;
            while (G < F.Geometry.Num())
            {
                const uint64 Command = F.Geometry[G++];
                const uint32 Id = static_cast<uint32>(Command & 7);
                const uint32 Count = static_cast<uint32>(Command >> 3);
                if (Id == 1 || Id == 2)
                {
                    for (uint32 Point = 0; Point < Count; ++Point)
                    {
                        if (G + 1 >= F.Geometry.Num()) { G = F.Geometry.Num(); break; }
                        CursorX += ZigZag(F.Geometry[G++]);
                        CursorY += ZigZag(F.Geometry[G++]);
                        const double U = static_cast<double>(CursorX) / Extent;
                        const double V = static_cast<double>(CursorY) / Extent;
                        const double Lon = (static_cast<double>(Tile.X) + U) / N * 360.0 - 180.0;
                        const double Mercator = PI * (1.0 - 2.0 * (static_cast<double>(Tile.Y) + V) / N);
                        const double Lat = FMath::RadiansToDegrees(FMath::Atan(0.5 * (FMath::Exp(Mercator) - FMath::Exp(-Mercator))));
                        if (Id == 1 && CurrentPath.Num() > 0 && Feature.GeometryType != EBPGeometryType::Point) FlushPath();
                        CurrentPath.Add(FVector2D(Lon, Lat));
                    }
                }
                else if (Id == 7)
                {
                    if (CurrentPath.Num() > 0)
                    {
                        if (!CurrentPath.Last().Equals(CurrentPath[0], KINDA_SMALL_NUMBER)) CurrentPath.Add(CurrentPath[0]);
                        FlushPath();
                    }
                }
                else { break; }
            }
            FlushPath();
            if (Feature.GeometryType != EBPGeometryType::Unknown && Feature.Paths.Num() > 0) Out.Add(MoveTemp(Feature));
        }
        return true;
    }
}

bool FBridgePointMVTDecoder::Decode(const TArray<uint8>& Bytes, const FBPGeoTileKey& Tile, TArray<FBPGeoFeature>& OutFeatures, FString& OutError)
{
    OutFeatures.Reset();
    if (Bytes.IsEmpty()) { OutError = TEXT("Empty vector tile"); return false; }
    FProtoReader R{Bytes.GetData(), Bytes.Num(), 0};
    while (R.Position < R.Size)
    {
        uint64 Tag = 0;
        if (!R.ReadVarint(Tag)) { OutError = TEXT("Malformed vector tile field header"); return false; }
        const int32 Field = static_cast<int32>(Tag >> 3), Wire = static_cast<int32>(Tag & 7);
        if (Field == 3 && Wire == 2)
        {
            const uint8* P = nullptr; int32 N = 0;
            if (!R.ReadBytes(P, N) || !ParseLayer(P, N, Tile, OutFeatures))
            {
                OutError = TEXT("Malformed Mapbox Vector Tile layer");
                OutFeatures.Reset();
                return false;
            }
        }
        else if (!R.Skip(Wire))
        {
            OutError = TEXT("Unsupported or malformed protobuf wire type");
            OutFeatures.Reset();
            return false;
        }
    }
    OutError.Reset();
    return true;
}