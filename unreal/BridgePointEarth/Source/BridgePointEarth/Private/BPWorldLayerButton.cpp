#include "BPWorldLayerButton.h"
#include "Components/TextBlock.h"

void UBPWorldLayerButton::NativeConstruct()
{
    Super::NativeConstruct();
    OnClicked.AddDynamic(this,&UBPWorldLayerButton::HandleClick);
    RefreshText();
}

void UBPWorldLayerButton::Configure(FName InLayerTag, const FText& InLabel, bool bAdapterReady, bool bInitiallyEnabled, UTextBlock* InLabelWidget)
{
    LayerTag=InLayerTag;
    DisplayLabel=InLabel;
    bReady=bAdapterReady;
    bLayerEnabled=bInitiallyEnabled;
    LabelWidget=InLabelWidget;
    SetIsEnabled(bReady);
    RefreshText();
}

void UBPWorldLayerButton::HandleClick()
{
    if (!bReady) return;
    bLayerEnabled=!bLayerEnabled;
    RefreshText();
    OnLayerToggled.Broadcast(LayerTag,bLayerEnabled);
}

void UBPWorldLayerButton::RefreshText()
{
    if (!LabelWidget) return;
    const FString State=bReady?(bLayerEnabled?TEXT("ON"):TEXT("OFF")):TEXT("SOURCE PENDING");
    LabelWidget->SetText(FText::FromString(FString::Printf(TEXT("%s   [%s]"),*DisplayLabel.ToString(),*State)));
}