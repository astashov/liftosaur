#import "RCTLiftosaurWatch.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import <WatchConnectivity/WatchConnectivity.h>
#import "Liftosaur-Swift.h"

static __weak RCTLiftosaurWatch *gCodegenWiredInstance = nil;

@implementation RCTLiftosaurWatch {
  BOOL _eventEmitterWired;
}

RCT_EXPORT_MODULE(LiftosaurWatch)

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
  [[LiftosaurWatchImpl shared] setEventEmitter:^(NSDictionary *event) {
    RCTLiftosaurWatch *target = gCodegenWiredInstance;
    if (target == nil) return;
    [target emitOnWatchEvent:event];
  }];
}

- (void)sendStorageToWatch:(NSString *)filteredStorageJson
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurWatchImpl shared] sendStorage:filteredStorageJson];
  resolve(nil);
}

- (void)sendAuthToWatch:(JS::NativeLiftosaurWatch::WatchAuth &)auth
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  NSString *token = auth.token();
  double expiresAt = auth.expiresAt();
  NSString *userId = auth.userId();
  [[LiftosaurWatchImpl shared] sendAuthWithToken:token expiresAt:expiresAt userId:userId];
  resolve(nil);
}

- (void)sendNoAuthToWatch:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWatchImpl shared] sendNoAuth];
  resolve(nil);
}

- (void)sendClearAuthToWatch:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWatchImpl shared] sendClearAuth];
  resolve(nil);
}

- (void)clearWatchStorage:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWatchImpl shared] clearStorage];
  resolve(nil);
}

- (void)sendFinishWorkoutToWatch:(BOOL)saveToHealth
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWatchImpl shared] sendFinishWorkoutWithSave:saveToHealth completion:^(BOOL watchSaved) {
    resolve(@(watchSaved));
  }];
}

- (void)sendDiscardWorkoutToWatch:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWatchImpl shared] sendDiscardWorkout];
  resolve(nil);
}

- (void)requestWatchLogs:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWatchImpl shared] requestLogsWithCompletion:^(NSString * _Nullable logs) {
    resolve(logs ?: @"");
  }];
}

- (NSNumber *)isWatchPaired {
  return @([[LiftosaurWatchImpl shared] isWatchPaired]);
}

- (NSNumber *)isWatchAppInstalled {
  return @([[LiftosaurWatchImpl shared] isWatchAppInstalled]);
}

- (NSNumber *)isWatchReachable {
  return @([[LiftosaurWatchImpl shared] isWatchReachable]);
}

- (void)flushPendingEvents:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurWatchImpl shared] flushPendingEvents];
  resolve(nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurWatchSpecJSI>(params);
}

@end
