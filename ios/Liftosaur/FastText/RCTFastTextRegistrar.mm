#import "RCTFastTextRegistrar.h"
#import "RCTFastTextView.h"

#import <React/RCTComponentViewFactory.h>

@implementation RCTFastTextRegistrar

+ (void)registerComponent {
  [[RCTComponentViewFactory currentComponentViewFactory] registerComponentViewClass:[RCTFastTextView class]];
}

@end
