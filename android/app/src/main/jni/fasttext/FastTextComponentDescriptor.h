#pragma once

#include "FastTextMeasurementsManager.h"
#include "FastTextShadowNode.h"

#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

// Named *Measuring* to avoid colliding with the codegen `FastTextComponentDescriptor`
// typedef (ConcreteComponentDescriptor<FastTextShadowNode>) generated for "type": "all".
class FastTextMeasuringComponentDescriptor final
    : public ConcreteComponentDescriptor<FastTextMeasuringShadowNode> {
 public:
  FastTextMeasuringComponentDescriptor(const ComponentDescriptorParameters& parameters)
      : ConcreteComponentDescriptor(parameters),
        measurementsManager_(std::make_shared<FastTextMeasurementsManager>(contextContainer_)) {}

  void adopt(ShadowNode& shadowNode) const override {
    ConcreteComponentDescriptor::adopt(shadowNode);
    auto& fastTextShadowNode = static_cast<FastTextMeasuringShadowNode&>(shadowNode);
    fastTextShadowNode.setFastTextMeasurementsManager(measurementsManager_);
  }

 private:
  const std::shared_ptr<FastTextMeasurementsManager> measurementsManager_;
};

} // namespace facebook::react
