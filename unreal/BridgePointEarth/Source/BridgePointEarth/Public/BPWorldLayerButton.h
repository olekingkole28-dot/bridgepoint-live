#pragma once

#include "CoreMinimal.h"
#include "Components/Button.h"
#include "BPWorldLayerButton.generated.h"

class UTextBlock;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FBPOnWorldLayerToggled, FName, LayerTag, bool, bEnabled);

UCLASS()
class BRIDGEPOINTEARTH_API UBPWorldLayerButton : public UButton
{
    GENERATED_BODY()

public:
    explicit UBPWorldLayerButton(const FObjectInitializer& ObjectInitializer);

    UPROPERTY(BlueprintAssignable, Category="BridgePoint|Layers")
    FBPOnWorldLayerToggled OnLayerToggled;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Layers")
    void Configure(FName InLayerTag, const FText& InLabel, bool bAdapterReady, bool bInitiallyEnabled, UTextBlock* InLabelWidget);

protected:

private:
    UPROPERTY(Transient) FName LayerTag;
    UPROPERTY(Transient) FText DisplayLabel;
    UPROPERTY(Transient) bool bReady = false;
    UPROPERTY(Transient) bool bLayerEnabled = false;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> LabelWidget;

    UFUNCTION() void HandleClick();
    void RefreshText();
};