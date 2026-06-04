#pragma once

#include <folly/dynamic.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/utils/ContextContainer.h>

namespace facebook::react {

class FastTextMeasurementsManager {
 public:
  FastTextMeasurementsManager(const std::shared_ptr<const ContextContainer>& contextContainer)
      : contextContainer_(contextContainer) {}

  Size measure(SurfaceId surfaceId, const folly::dynamic& props, LayoutConstraints layoutConstraints) const;

 private:
  const std::shared_ptr<const ContextContainer> contextContainer_;
};

} // namespace facebook::react
