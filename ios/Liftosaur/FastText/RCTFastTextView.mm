#import "RCTFastTextView.h"

#import <cmath>
#import <memory>
#import <string>

#import <react/renderer/components/LiftosaurSpecs/ComponentDescriptors.h>
#import <react/renderer/components/LiftosaurSpecs/Props.h>
#import <react/renderer/components/LiftosaurSpecs/RCTComponentViewHelpers.h>
#import <react/renderer/core/LayoutConstraints.h>
#import <react/renderer/graphics/Color.h>

#import "FastTextComponentDescriptor.h"

// Liftosaur-Swift.h is the whole-module umbrella, so it declares every Swift class incl.
// ReactNativeDelegate; its ObjC superclass must be visible first (as in RCTLiftosaurShare.mm).
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

using namespace facebook::react;

// FastTextComponentName is defined by the codegen ShadowNodes.cpp; we only declare it
// (via FastTextShadowNode.h) and reuse it so the component handle matches.

// Marshaling helpers: the styling/drawing/measuring logic lives in Swift (FastText.swift);
// ObjC++ only converts C++ props (std::string, SharedColor, fragments) into a FastTextSpec.
// Inlined instead of RCTConversions.h (a private React-RCTFabric header, not exposed to the
// app target). Colors arrive already resolved to concrete RGBA from Tailwind in JS, so
// component-based conversion is sufficient (no native platform/dynamic colors to preserve).
static NSString *FastTextNSString(const std::string &string) {
  return [NSString stringWithCString:string.c_str() encoding:NSUTF8StringEncoding] ?: @"";
}

static UIColor *_Nullable FastTextUIColor(const SharedColor &sharedColor) {
  if (!sharedColor) {
    return nil;
  }
  ColorComponents components = colorComponentsFromColor(sharedColor);
  return [UIColor colorWithRed:components.red green:components.green blue:components.blue alpha:components.alpha];
}

static int FastTextParseWeight(const std::string &weight, int fallback) {
  if (weight.empty()) {
    return fallback;
  }
  try {
    return std::stoi(weight);
  } catch (...) {
    return fallback;
  }
}

// nil => inherit base italic; @YES/@NO => explicit, mirroring the weight-0 inherit sentinel.
static NSNumber *_Nullable FastTextItalic(const std::string &fontStyle) {
  if (fontStyle.empty()) {
    return nil;
  }
  return @(fontStyle == "italic");
}

// nil => no decoration; the Swift side only acts on "underline"/"line-through".
static NSString *_Nullable FastTextDecoration(const std::string &textDecorationLine) {
  if (textDecorationLine.empty()) {
    return nil;
  }
  return FastTextNSString(textDecorationLine);
}

static FastTextSpec *FastTextSpecFromProps(const FastTextProps &props) {
  NSMutableArray<FastTextFragmentSpec *> *fragments = [NSMutableArray arrayWithCapacity:props.fragments.size()];
  for (const auto &f : props.fragments) {
    // weight 0 / fontSize 0 / italic nil mean "inherit base" on the Swift side.
    [fragments addObject:[[FastTextFragmentSpec alloc] initWithStart:f.start
                                                                 end:f.end
                                                               color:FastTextUIColor(f.color)
                                                     backgroundColor:FastTextUIColor(f.backgroundColor)
                                                              weight:FastTextParseWeight(f.fontWeight, 0)
                                                            fontSize:(f.fontSize > 0 ? f.fontSize : 0)
                                                              italic:FastTextItalic(f.fontStyle)
                                                          decoration:FastTextDecoration(f.textDecorationLine)]];
  }
  return [[FastTextSpec alloc] initWithText:FastTextNSString(props.text)
                                      color:(FastTextUIColor(props.color) ?: UIColor.blackColor)
                                   fontSize:(props.fontSize > 0 ? props.fontSize : 16)
                                     weight:FastTextParseWeight(props.fontWeight, 400)
                                     italic:(props.fontStyle == "italic")
                                 fontFamily:(props.fontFamily.empty() ? nil : FastTextNSString(props.fontFamily))
                          paddingHorizontal:props.textPaddingHorizontal
                                 lineHeight:props.textLineHeight
                              numberOfLines:(props.numberOfLines > 0 ? props.numberOfLines : 0)
                                  textAlign:FastTextNSString(props.textAlign)
                                 decoration:FastTextDecoration(props.textDecorationLine)
                          accessibilityText:FastTextNSString(props.accessibilityLabel)
                                  fragments:fragments];
}

namespace facebook::react {

Size FastTextMeasuringShadowNode::measureContent(
    const LayoutContext & /*layoutContext*/,
    const LayoutConstraints &layoutConstraints) const {
  const auto &props = getConcreteProps();
  @autoreleasepool {
    FastTextSpec *spec = FastTextSpecFromProps(props);
    Float maxWidth = layoutConstraints.maximumSize.width;
    Float maxHeight = layoutConstraints.maximumSize.height;
    CGSize measured = [FastTextRenderer measure:spec
                                       maxWidth:(std::isinf(maxWidth) ? 0 : (CGFloat)maxWidth)
                                      maxHeight:(std::isinf(maxHeight) ? CGFLOAT_MAX : (CGFloat)maxHeight)];
    Size size;
    size.width = (Float)measured.width;
    size.height = (Float)measured.height;
    return layoutConstraints.clamp(size);
  }
}

} // namespace facebook::react

@implementation RCTFastTextView {
  FastTextContentView *_contentView;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const FastTextProps>();
    _props = defaultProps;
    self.opaque = NO;
    _contentView = [[FastTextContentView alloc] initWithFrame:CGRectZero];
    self.contentView = _contentView;
  }
  return self;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<FastTextMeasuringComponentDescriptor>();
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps {
  const auto &newProps = static_cast<const FastTextProps &>(*props);
  _contentView.spec = FastTextSpecFromProps(newProps);

  [super updateProps:props oldProps:oldProps];

  // Base `backgroundColor` fills the whole rect incl. padding (matches Android). It's a
  // custom prop, separate from ViewProps.backgroundColor (which super applies), so set it
  // after super to win.
  self.backgroundColor = FastTextUIColor(newProps.backgroundColor) ?: UIColor.clearColor;
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _contentView.spec = nil;
}

@end

Class<RCTComponentViewProtocol> RCTFastTextCls(void) {
  return RCTFastTextView.class;
}
