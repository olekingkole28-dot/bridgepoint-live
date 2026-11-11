#include "BPWorldLayerMenuWidget.h"
#include "BridgePointEarthStreamingSubsystem.h"
#include "BPWorldLayerButton.h"
#include "Components/Border.h"
#include "Components/ScrollBox.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "Components/TextBlock.h"
#include "Blueprint/WidgetTree.h"

void UBPWorldLayerMenuWidget::NativeConstruct()
{
    Super::NativeConstruct();
    if (WidgetTree && !WidgetTree->RootWidget)
    {
        PanelBorder=WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(),TEXT("BridgePointLayerPanel"));
        PanelBorder->SetPadding(FMargin(10.0f));
        LayerScroll=WidgetTree->ConstructWidget<UScrollBox>(UScrollBox::StaticClass(),TEXT("LayerScroll"));
        LayerList=WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(),TEXT("LayerList"));
        LayerScroll->AddChild(LayerList);
        PanelBorder->SetContent(LayerScroll);
        WidgetTree->RootWidget=PanelBorder;
    }
    RebuildLayerMenu();
}

void UBPWorldLayerMenuWidget::ShowLayerMenu()
{
    RebuildLayerMenu();
    AddToViewport();
}

void UBPWorldLayerMenuWidget::RebuildLayerMenu()
{
    if (!WidgetTree || !LayerList) return;
    LayerList->ClearChildren();

    UBridgePointEarthStreamingSubsystem* Streaming=GetWorld() ? GetWorld()->GetSubsystem<UBridgePointEarthStreamingSubsystem>() : nullptr;
    if (!Streaming)
    {
        UTextBlock* Status=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
        Status->SetText(FText::FromString(TEXT("BridgePoint Earth streaming subsystem is unavailable.")));
        LayerList->AddChildToVerticalBox(Status);
        return;
    }

    UTextBlock* Title=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
    Title->SetText(FText::FromString(TEXT("BRIDGEPOINT EARTH LAYERS")));
    LayerList->AddChildToVerticalBox(Title);

    UTextBlock* Caption=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
    Caption->SetText(FText::FromString(TEXT("Source-backed layers are interactive. Pending adapters remain visible but disabled until their feed is connected.")));
    LayerList->AddChildToVerticalBox(Caption);

    const TArray<FBPWorldLayerDefinition> Catalog=Streaming->GetLayerCatalog();
    FText CurrentGroup;
    for (const FBPWorldLayerDefinition& Definition:Catalog)
    {
        if (Definition.Group.ToString()!=CurrentGroup.ToString())
        {
            CurrentGroup=Definition.Group;
            UTextBlock* Header=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
            Header->SetText(CurrentGroup);
            LayerList->AddChildToVerticalBox(Header);
        }

        UBPWorldLayerButton* Button=WidgetTree->ConstructWidget<UBPWorldLayerButton>(UBPWorldLayerButton::StaticClass());
        UTextBlock* Label=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
        Button->AddChild(Label);
        Button->Configure(Definition.RuntimeTag,Definition.DisplayName,Definition.bSourceAdapterConnected,
                          Definition.bEnabledByDefault,Label);
        Button->OnLayerToggled.AddDynamic(this,&UBPWorldLayerMenuWidget::HandleLayerToggled);
        LayerList->AddChildToVerticalBox(Button);
    }
}

void UBPWorldLayerMenuWidget::HandleLayerToggled(FName LayerTag, bool bEnabled)
{
    if (UBridgePointEarthStreamingSubsystem* Streaming=GetWorld()->GetSubsystem<UBridgePointEarthStreamingSubsystem>())
        Streaming->SetLayerEnabled(LayerTag,bEnabled);
}