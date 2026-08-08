#import "RCTLiftoEditorView.h"

#import <string>

#import <react/renderer/components/LiftosaurSpecs/ComponentDescriptors.h>
#import <react/renderer/components/LiftosaurSpecs/EventEmitters.h>
#import <react/renderer/components/LiftosaurSpecs/Props.h>
#import <react/renderer/components/LiftosaurSpecs/RCTComponentViewHelpers.h>

// Liftosaur-Swift.h is the whole-module umbrella, so it declares every Swift class incl.
// ReactNativeDelegate; its ObjC superclass must be visible first (as in RCTFastTextView.mm).
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

using namespace facebook::react;

static NSString *LiftoEditorNSString(const std::string &string) {
  return [NSString stringWithCString:string.c_str() encoding:NSUTF8StringEncoding] ?: @"";
}

@interface RCTLiftoEditorView () <RCTLiftoEditorViewProtocol>
@end

@implementation RCTLiftoEditorView {
  LiftoEditorContentView *_editorView;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const LiftoEditorProps>();
    _props = defaultProps;
    _editorView = [[LiftoEditorContentView alloc] initWithFrame:CGRectZero];
    __weak RCTLiftoEditorView *weakSelf = self;
    _editorView.onTextDelta = ^(NSInteger start, NSInteger end, NSString *insertedText, NSInteger textLength) {
      RCTLiftoEditorView *strongSelf = weakSelf;
      if (strongSelf == nil || strongSelf->_eventEmitter == nil) {
        return;
      }
      const auto &eventEmitter = static_cast<const LiftoEditorEventEmitter &>(*strongSelf->_eventEmitter);
      eventEmitter.onTextDelta({
          .start = (int)start,
          .end = (int)end,
          .insertedText = std::string(insertedText.UTF8String ?: ""),
          .textLength = (int)textLength,
      });
    };
    _editorView.onSelectionChange = ^(NSInteger start, NSInteger end) {
      RCTLiftoEditorView *strongSelf = weakSelf;
      if (strongSelf == nil || strongSelf->_eventEmitter == nil) {
        return;
      }
      const auto &eventEmitter = static_cast<const LiftoEditorEventEmitter &>(*strongSelf->_eventEmitter);
      eventEmitter.onEditorSelectionChange({.start = (int)start, .end = (int)end});
    };
    _editorView.onContentSizeChange = ^(double width, double height) {
      RCTLiftoEditorView *strongSelf = weakSelf;
      if (strongSelf == nil || strongSelf->_eventEmitter == nil) {
        return;
      }
      const auto &eventEmitter = static_cast<const LiftoEditorEventEmitter &>(*strongSelf->_eventEmitter);
      eventEmitter.onEditorContentSizeChange({.width = width, .height = height});
    };
    _editorView.onTap = ^(NSInteger index) {
      RCTLiftoEditorView *strongSelf = weakSelf;
      if (strongSelf == nil || strongSelf->_eventEmitter == nil) {
        return;
      }
      const auto &eventEmitter = static_cast<const LiftoEditorEventEmitter &>(*strongSelf->_eventEmitter);
      eventEmitter.onEditorTap({.index = (int)index});
    };
    _editorView.onCaretRect = ^(double top, double bottom) {
      RCTLiftoEditorView *strongSelf = weakSelf;
      if (strongSelf == nil || strongSelf->_eventEmitter == nil) {
        return;
      }
      const auto &eventEmitter = static_cast<const LiftoEditorEventEmitter &>(*strongSelf->_eventEmitter);
      eventEmitter.onEditorCaretRect({.top = top, .bottom = bottom});
    };
    self.contentView = _editorView;
  }
  return self;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<LiftoEditorComponentDescriptor>();
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps {
  const auto &newProps = static_cast<const LiftoEditorProps &>(*props);
  const auto &prevProps = static_cast<const LiftoEditorProps &>(*_props);
  [_editorView setInitialText:LiftoEditorNSString(newProps.initialText)];
  if (newProps.fontSize != prevProps.fontSize) {
    [_editorView applyFontSize:newProps.fontSize];
  }
  if (newProps.editable != prevProps.editable) {
    [_editorView applyEditable:newProps.editable];
  }
  if (newProps.showLineNumbers != prevProps.showLineNumbers) {
    [_editorView applyShowLineNumbers:newProps.showLineNumbers];
  }
  [super updateProps:props oldProps:oldProps];
}

- (void)updateEventEmitter:(const EventEmitter::Shared &)eventEmitter {
  [super updateEventEmitter:eventEmitter];
  [_editorView flushContentSize];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_editorView prepareForReuse];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
  RCTLiftoEditorHandleCommand(self, commandName, args);
}

- (void)setText:(NSString *)text {
  [_editorView applyText:text];
}

- (void)setStyledRanges:(NSString *)rangesJson {
  [_editorView applyStyledRangesJson:rangesJson];
}

- (void)patchStyledRanges:(NSInteger)start end:(NSInteger)end rangesJson:(NSString *)rangesJson {
  [_editorView applyStyledRangesPatch:start end:end json:rangesJson];
}

- (void)setSelection:(NSInteger)start end:(NSInteger)end {
  [_editorView applySelection:start end:end];
}

- (void)replaceRange:(NSInteger)start end:(NSInteger)end text:(NSString *)text {
  [_editorView applyReplaceRange:start end:end text:text];
}

- (void)requestCaretRect:(NSInteger)start end:(NSInteger)end {
  [_editorView requestCaretRect:start end:end];
}

@end

Class<RCTComponentViewProtocol> RCTLiftoEditorCls(void) {
  return RCTLiftoEditorView.class;
}
