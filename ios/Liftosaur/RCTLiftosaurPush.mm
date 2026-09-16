#import "RCTLiftosaurPush.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

static __weak RCTLiftosaurPush *gCodegenWiredInstance = nil;

@implementation RCTLiftosaurPush {
  BOOL _eventEmitterWired;
}

RCT_EXPORT_MODULE(LiftosaurPush)

- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)wrapper {
  [super setEventEmitterCallback:wrapper];
  gCodegenWiredInstance = self;
  [self wireEventEmitterIfNeeded];
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)wireEventEmitterIfNeeded {
  if (_eventEmitterWired) return;
  _eventEmitterWired = YES;
  [[LiftosaurPushImpl shared] setEmittersWithToken:^(NSDictionary *event) {
    RCTLiftosaurPush *target = gCodegenWiredInstance;
    if (target == nil) return;
    [target emitOnToken:event];
  } push:^(NSDictionary *event) {
    RCTLiftosaurPush *target = gCodegenWiredInstance;
    if (target == nil) return;
    [target emitOnPush:event];
  }];
}

- (void)start:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurPushImpl shared] start];
  resolve(nil);
}

- (void)flushPending:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurPushImpl shared] flushPending];
  resolve(nil);
}

- (void)complete:(NSString *)deliveryId
         newData:(BOOL)newData
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurPushImpl shared] completeWithDeliveryId:deliveryId newData:newData];
  resolve(nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurPushSpecJSI>(params);
}

@end
