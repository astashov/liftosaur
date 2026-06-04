#pragma once

#include "FastTextShadowNode.h"

#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

// Named *Measuring* to avoid colliding with the codegen `FastTextComponentDescriptor`
// typedef (ConcreteComponentDescriptor<FastTextShadowNode>) generated for "type": "all".
// RCTFastTextView returns this from +componentDescriptorProvider, so it is the descriptor
// the factory uses for the "FastText" handle (no codegen-default conflict on iOS).
class FastTextMeasuringComponentDescriptor final
    : public ConcreteComponentDescriptor<FastTextMeasuringShadowNode> {
 public:
  using ConcreteComponentDescriptor::ConcreteComponentDescriptor;
};

} // namespace facebook::react
