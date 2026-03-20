#import "RCTWebViewPool.h"
#import <React/RCTBridgeModule.h>
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import <WebKit/WebKit.h>
#import "LiftosaurNative-Swift.h"

#if __has_include(<LiftosaurNativeSpecs/LiftosaurNativeSpecs.h>)
#import <LiftosaurNativeSpecs/LiftosaurNativeSpecs.h>
#endif

@interface RCTWebViewPool () <NativeWebViewPoolSpec>
@end

@implementation RCTWebViewPool

RCT_EXPORT_MODULE(WebViewPool)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onWebViewMessage"];
}

- (instancetype)init {
  self = [super init];
  if (self) {
    __weak RCTWebViewPool *weakSelf = self;
    [WebViewPoolImpl shared].onMessage = ^(NSInteger slotId, NSString *data) {
      [weakSelf sendEventWithName:@"onWebViewMessage" body:@{@"slotId": @(slotId), @"data": data}];
    };
  }
  return self;
}

- (void)setup:(NSString *)url poolSize:(double)poolSize {
  [[WebViewPoolImpl shared] setupWithUrl:url poolSize:(NSInteger)poolSize];
}

- (void)acquire:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [[WebViewPoolImpl shared] acquireWithCompletion:^(NSInteger slotId) {
    resolve(@(slotId));
  }];
}

- (void)attach:(double)slotId
    targetNativeID:(NSString *)targetNativeID
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [[WebViewPoolImpl shared] attachWithSlotId:(NSInteger)slotId
                              targetNativeID:targetNativeID
                                  completion:^(BOOL success) {
    resolve(@(success));
  }];
}

- (void)releaseSlot:(double)slotId {
  [[WebViewPoolImpl shared] releaseSlotWithSlotId:(NSInteger)slotId];
}

- (void)injectJavaScript:(double)slotId js:(NSString *)js {
  [[WebViewPoolImpl shared] injectJavaScriptWithSlotId:(NSInteger)slotId js:js];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeWebViewPoolSpecJSI>(params);
}

@end
