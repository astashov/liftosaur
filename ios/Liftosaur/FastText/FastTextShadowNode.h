#pragma once

#include <react/renderer/components/LiftosaurSpecs/EventEmitters.h>
#include <react/renderer/components/LiftosaurSpecs/Props.h>
#include <react/renderer/components/LiftosaurSpecs/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

extern const char FastTextComponentName[];

// Self-measuring leaf so the single Fabric text node sizes to its content (the codegen
// default ConcreteViewShadowNode measures a leaf to flex constraints only -> width 0).
// measureContent is implemented in RCTFastTextView.mm (ObjC++) so it can build an
// NSAttributedString and measure it directly via UIKit, without the Android-style
// FabricUIManager round-trip.
class FastTextMeasuringShadowNode final
    : public ConcreteViewShadowNode<
          FastTextComponentName,
          FastTextProps,
          FastTextEventEmitter,
          FastTextState> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  static ShadowNodeTraits BaseTraits() {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    return traits;
  }

  Size measureContent(const LayoutContext& layoutContext, const LayoutConstraints& layoutConstraints)
      const override;
};

} // namespace facebook::react
