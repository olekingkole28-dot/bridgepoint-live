#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "BPWorldLayerMenuWidget.generated.h"

class UBorder;
class UScrollBox;
class UVerticalBox;
class UTextBlock;
class UBPWorldLayerButton;

UCLASS(BlueprintType)
class BRIDGEPOINT_EARTH_API UBPWorldLayerMenuWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category="BridgePoint|Layers")
    void RebuildLayerMenu();

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Layers")
    void ShowLayerMenu();

protected:
    virtual void NativeConstruct() override;

private:
    UPROPERTY(Transient) TObjectPtr<UBorder> PanelBorder;
    UPROPERTY(Transient) TObjectPtr<UScrollBox> LayerScroll;
    UPROPERTY(Transient) TObjectPtr<UVerticalBox> LayerList;

    UFUNCTION() void HandleLayerToggled(FName LayerTag, bool bEnabled);
};