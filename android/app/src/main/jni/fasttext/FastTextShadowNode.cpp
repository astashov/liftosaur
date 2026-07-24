#include "FastTextShadowNode.h"

namespace facebook::react {

void FastTextMeasuringShadowNode::setFastTextMeasurementsManager(
    const std::shared_ptr<FastTextMeasurementsManager>& measurementsManager) {
  ensureUnsealed();
  measurementsManager_ = measurementsManager;
}

Size FastTextMeasuringShadowNode::measureContent(
    const LayoutContext& /*layoutContext*/,
    const LayoutConstraints& layoutConstraints) const {
  const auto& props = getConcreteProps();
  folly::dynamic serialized = folly::dynamic::object;
  serialized["text"] = props.text;
  serialized["fontSize"] = props.fontSize;
  serialized["fontWeight"] = props.fontWeight;
  serialized["fontStyle"] = props.fontStyle;
  // Must match the drawn font: a custom family (e.g. Iosevka) has different line metrics than
  // Poppins, so measuring in Poppins under-measures the height and clips the lower lines.
  serialized["fontFamily"] = props.fontFamily;
  serialized["textPaddingHorizontal"] = props.textPaddingHorizontal;
  serialized["textLineHeight"] = props.textLineHeight;

  folly::dynamic fragments = folly::dynamic::array;
  for (const auto& f : props.fragments) {
    folly::dynamic fragment = folly::dynamic::object;
    fragment["start"] = f.start;
    fragment["end"] = f.end;
    fragment["fontWeight"] = f.fontWeight;
    fragment["fontSize"] = f.fontSize;
    fragment["fontStyle"] = f.fontStyle;
    fragments.push_back(fragment);
  }
  serialized["fragments"] = fragments;

  return measurementsManager_->measure(getSurfaceId(), serialized, layoutConstraints);
}

} // namespace facebook::react
