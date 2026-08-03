#import "RCTLiftoEditorRegistrar.h"
#import "RCTLiftoEditorView.h"

#import <React/RCTComponentViewFactory.h>

@implementation RCTLiftoEditorRegistrar

+ (void)registerComponent {
  [[RCTComponentViewFactory currentComponentViewFactory] registerComponentViewClass:[RCTLiftoEditorView class]];
}

@end
