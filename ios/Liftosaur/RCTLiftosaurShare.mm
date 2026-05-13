#import "RCTLiftosaurShare.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import <ExpoModulesCore/ExpoModulesCore-Swift.h>
#import "Liftosaur-Swift.h"

@implementation RCTLiftosaurShare

RCT_EXPORT_MODULE(LiftosaurShare)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)shareToIGStory:(NSString *)workoutImagePath
       backgroundImagePath:(NSString *)backgroundImagePath
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurShareImpl shared] shareToIGStoryWithWorkoutImagePath:workoutImagePath
                                              backgroundImagePath:backgroundImagePath
                                                       completion:^(NSString * _Nullable error) {
    if (error) {
      reject(@"share_failed", error, nil);
    } else {
      resolve(nil);
    }
  }];
}

- (void)shareToIGFeed:(NSString *)workoutImagePath
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurShareImpl shared] shareToIGFeedWithWorkoutImagePath:workoutImagePath
                                                      completion:^(NSString * _Nullable error) {
    if (error) {
      reject(@"share_failed", error, nil);
    } else {
      resolve(nil);
    }
  }];
}

- (void)shareToTiktok:(NSString *)workoutImagePath
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurShareImpl shared] shareToTiktokWithWorkoutImagePath:workoutImagePath
                                                      completion:^(NSString * _Nullable error) {
    if (error) {
      reject(@"share_failed", error, nil);
    } else {
      resolve(nil);
    }
  }];
}

- (void)shareLog:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurShareImpl shared] shareLogWithCompletion:^(NSString * _Nullable error) {
    if (error) {
      reject(@"share_log_failed", error, nil);
    } else {
      resolve(nil);
    }
  }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurShareSpecJSI>(params);
}

@end
