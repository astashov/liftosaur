#include "FastTextMeasurementsManager.h"

#include <fbjni/fbjni.h>
#include <react/jni/ReadableNativeMap.h>
#include <react/renderer/core/conversions.h>

using namespace facebook::jni;

namespace facebook::react {

Size FastTextMeasurementsManager::measure(
    SurfaceId surfaceId,
    const folly::dynamic& props,
    LayoutConstraints layoutConstraints) const {
  const jni::global_ref<jobject>& fabricUIManager =
      contextContainer_->at<jni::global_ref<jobject>>("FabricUIManager");

  static auto measure =
      jni::findClassStatic("com/facebook/react/fabric/FabricUIManager")
          ->getMethod<jlong(
              jint,
              jstring,
              ReadableMap::javaobject,
              ReadableMap::javaobject,
              ReadableMap::javaobject,
              jfloat,
              jfloat,
              jfloat,
              jfloat)>("measure");

  auto minimumSize = layoutConstraints.minimumSize;
  auto maximumSize = layoutConstraints.maximumSize;

  local_ref<JString> componentName = make_jstring("FastText");
  local_ref<ReadableNativeMap::jhybridobject> propsMap =
      ReadableNativeMap::createWithContents(folly::dynamic(props));

  return yogaMeassureToSize(measure(
      fabricUIManager,
      surfaceId,
      componentName.get(),
      nullptr,
      // ReadableNativeMap and ReadableMap are unrelated in fbjni's type system, but
      // the underlying Java object implements ReadableMap.
      reinterpret_cast<ReadableMap::javaobject>(propsMap.get()),
      nullptr,
      minimumSize.width,
      maximumSize.width,
      minimumSize.height,
      maximumSize.height));
}

} // namespace facebook::react
