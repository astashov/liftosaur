#import "RCTLiftosaurTimer.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import <ExpoModulesCore/ExpoModulesCore-Swift.h>
#import <Expo/Expo-Swift.h>
#import "Liftosaur-Swift.h"

@implementation RCTLiftosaurTimer

RCT_EXPORT_MODULE(LiftosaurTimer)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)startTimer:(JS::NativeLiftosaurTimer::LiftosaurTimerStartParams &)params
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurTimerImpl shared] startTimerWithDuration:params.duration()
                                                title:params.title()
                                       subtitleHeader:params.subtitleHeader()
                                             subtitle:params.subtitle()
                                           bodyHeader:params.bodyHeader()
                                                 body:params.body()
                                               volume:params.volume()
                                            vibration:params.vibration()
                                   ignoreDoNotDisturb:params.ignoreDoNotDisturb()
                                           completion:^(BOOL scheduled, NSString * _Nullable missingPermission) {
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    result[@"scheduled"] = @(scheduled);
    if (missingPermission != nil) {
      result[@"missingPermission"] = missingPermission;
    }
    resolve(result);
  }];
}

- (void)stopTimer:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurTimerImpl shared] stopTimer];
  resolve(nil);
}

- (void)scheduleReminder:(double)duration
                   title:(NSString *)title
                    body:(NSString *)body
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurTimerImpl shared] scheduleReminderWithDuration:duration
                                                       title:title
                                                        body:body
                                                  completion:^(BOOL scheduled, NSString * _Nullable missingPermission) {
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    result[@"scheduled"] = @(scheduled);
    if (missingPermission != nil) {
      result[@"missingPermission"] = missingPermission;
    }
    resolve(result);
  }];
}

- (void)cancelReminder:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurTimerImpl shared] cancelReminder];
  resolve(nil);
}

- (void)playSound:(double)volume
        vibration:(BOOL)vibration
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurTimerImpl shared] playSoundWithVolume:volume vibration:vibration];
  resolve(nil);
}

- (void)getNotificationPermission:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurTimerImpl shared] getNotificationPermissionWithCompletion:^(NSString * _Nonnull status) {
    resolve(status);
  }];
}

- (void)requestNotificationPermission:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurTimerImpl shared] requestNotificationPermissionWithCompletion:^(NSString * _Nonnull status) {
    resolve(status);
  }];
}

- (void)getExactAlarmPermission:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
  resolve(@"unavailable");
}

- (void)requestExactAlarmPermission:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
  resolve(@"unavailable");
}

- (void)getDndAccessPermission:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
  resolve(@"unavailable");
}

- (void)requestDndAccessPermission:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject {
  resolve(@"unavailable");
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurTimerSpecJSI>(params);
}

@end
