#import <UIKit/UIKit.h>
#import <objc/runtime.h>

// The NSRangeException thrown by unmountChildComponentView:index: propagates
// through C++ frames (SurfaceHandler::stop → commitEmptyTree) which call
// std::terminate, so NSUncaughtExceptionHandler can never see it.
// Swizzling with @try/@catch catches it at the ObjC level before C++ unwinds.

static IMP originalUnmount = NULL;

static void safe_unmountChildComponentView(id self, SEL _cmd, UIView *childComponentView, NSInteger index) {
  @try {
    ((void (*)(id, SEL, UIView *, NSInteger))originalUnmount)(self, _cmd, childComponentView, index);
  } @catch (NSException *exception) {
    if ([exception.name isEqualToString:NSRangeException] ||
        [exception.name isEqualToString:NSInternalInconsistencyException]) {
      NSLog(@"[SafeUnmount] Suppressed %@ in unmountChildComponentView:index: — %@",
            exception.name, exception.reason);
    } else {
      @throw;
    }
  }
}

__attribute__((constructor))
static void InstallSafeUnmountSwizzle(void) {
  Class cls = NSClassFromString(@"RCTViewComponentView");
  if (!cls) {
    NSLog(@"[SafeUnmount] RCTViewComponentView class not found");
    return;
  }

  SEL sel = @selector(unmountChildComponentView:index:);
  Method method = class_getInstanceMethod(cls, sel);
  if (!method) {
    NSLog(@"[SafeUnmount] unmountChildComponentView:index: method not found");
    return;
  }

  originalUnmount = method_setImplementation(method, (IMP)safe_unmountChildComponentView);
  NSLog(@"[SafeUnmount] Swizzled unmountChildComponentView:index: successfully");
}
