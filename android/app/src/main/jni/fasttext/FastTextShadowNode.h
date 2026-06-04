#pragma once

#include "FastTextMeasurementsManager.h"

#include <react/renderer/components/LiftosaurSpecs/EventEmitters.h>
#include <react/renderer/components/LiftosaurSpecs/Props.h>
#include <react/renderer/components/LiftosaurSpecs/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

extern const char FastTextComponentName[];

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

  void setFastTextMeasurementsManager(const std::shared_ptr<FastTextMeasurementsManager>& measurementsManager);

  Size measureContent(const LayoutContext& layoutContext, const LayoutConstraints& layoutConstraints)
      const override;

 private:
  std::shared_ptr<FastTextMeasurementsManager> measurementsManager_;
};

} // namespace facebook::react
