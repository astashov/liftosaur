#import "RCTLiftosaurWorkoutMirroring.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

static __weak RCTLiftosaurWorkoutMirroring *gCodegenWiredInstance = nil;

@implementation RCTLiftosaurWorkoutMirroring {
  BOOL _eventEmitterWired;
}

RCT_EXPORT_MODULE(LiftosaurWorkoutMirroring)

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
  [[LiftosaurWorkoutMirroringImpl shared] setEventEmitter:^(NSDictionary *event) {
    RCTLiftosaurWorkoutMirroring *target = gCodegenWiredInstance;
    if (target == nil) return;
    [target emitOnMirroringEvent:event];
  }];
}

- (void)startWatchWorkout:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurWorkoutMirroringImpl shared] startWatchWorkoutWithCompletion:^(BOOL started) {
    resolve(@(started));
  }];
}

- (void)pauseWatchWorkout:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWorkoutMirroringImpl shared] pauseWatchWorkout];
  resolve(nil);
}

- (void)resumeWatchWorkout:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWorkoutMirroringImpl shared] resumeWatchWorkout];
  resolve(nil);
}

- (void)endWatchWorkout:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWorkoutMirroringImpl shared] endWatchWorkout];
  resolve(nil);
}

- (void)resetWatchWorkoutState:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurWorkoutMirroringImpl shared] resetWatchWorkoutState];
  resolve(nil);
}

- (NSNumber *)isHealthKitAvailable {
  return @([[LiftosaurWorkoutMirroringImpl shared] isHealthKitAvailable]);
}

- (NSNumber *)isWatchWorkoutActive {
  return @([[LiftosaurWorkoutMirroringImpl shared] isWatchWorkoutActiveObjC]);
}

- (NSNumber *)didStartWatchWorkout {
  return @([[LiftosaurWorkoutMirroringImpl shared] didStartWatchWorkoutObjC]);
}

- (void)flushPendingEvents:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurWorkoutMirroringImpl shared] flushPendingEvents];
  resolve(nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurWorkoutMirroringSpecJSI>(params);
}

@end
