#import "RCTWebViewReparenter.h"
#import <React/RCTBridgeModule.h>
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "LiftosaurNative-Swift.h"

@implementation RCTWebViewReparenter

RCT_EXPORT_MODULE(WebViewReparenter)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)reparent:(NSString *)childNativeID
    newParentNativeID:(NSString *)newParentNativeID
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [[WebViewReparenterImpl shared] reparentWithChildNativeID:childNativeID
                                          newParentNativeID:newParentNativeID
                                                 completion:^(BOOL success) {
    resolve(@(success));
  }];
}

- (void)dumpViewHierarchy:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [[WebViewReparenterImpl shared] dumpViewHierarchyWithCompletion:^(NSString *result) {
    resolve(result);
  }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeWebViewReparenterSpecJSI>(params);
}

@end
