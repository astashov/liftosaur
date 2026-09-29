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

- (void)setDesiredWorkout:(double)workoutId status:(NSString *)status expectWatch:(BOOL)expectWatch {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurWorkoutMirroringImpl shared] setDesiredWorkoutWithWorkoutId:workoutId
                                                                  status:status
                                                             expectWatch:expectWatch];
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
