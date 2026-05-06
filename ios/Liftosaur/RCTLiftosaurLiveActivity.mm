#import "RCTLiftosaurLiveActivity.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

@implementation RCTLiftosaurLiveActivity

RCT_EXPORT_MODULE(LiftosaurLiveActivity)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

static NSDictionary *DictFromState(JS::NativeLiftosaurLiveActivity::LiveActivityState &state) {
  NSMutableDictionary *dict = [NSMutableDictionary dictionary];
  dict[@"workoutStartTimestamp"] = @(state.workoutStartTimestamp());
  dict[@"ignoreDoNotDisturb"] = @(state.ignoreDoNotDisturb());
  if (auto rest = state.rest()) {
    dict[@"rest"] = @{
      @"restTimerSince": @(rest->restTimerSince()),
      @"restTimer": @(rest->restTimer()),
    };
  }
  if (auto entry = state.entry()) {
    NSMutableDictionary *e = [NSMutableDictionary dictionary];
    e[@"exerciseName"] = entry->exerciseName();
    e[@"currentSet"] = @(entry->currentSet());
    e[@"totalSets"] = @(entry->totalSets());
    e[@"canCompleteFromLiveActivity"] = @(entry->canCompleteFromLiveActivity());
    e[@"isWarmup"] = @(entry->isWarmup());
    e[@"entryIndex"] = @(entry->entryIndex());
    e[@"setIndex"] = @(entry->setIndex());
    if (auto v = entry->exerciseImageUrl()) e[@"exerciseImageUrl"] = v;
    if (auto v = entry->targetReps()) e[@"targetReps"] = v;
    if (auto v = entry->targetWeight()) e[@"targetWeight"] = v;
    if (auto v = entry->targetRPE()) e[@"targetRPE"] = v;
    if (auto v = entry->targetTimer()) e[@"targetTimer"] = v;
    if (auto v = entry->plates()) e[@"plates"] = v;
    if (auto v = entry->currentWeight()) e[@"currentWeight"] = v;
    if (auto v = entry->currentReps()) e[@"currentReps"] = v;
    dict[@"entry"] = e;
  }
  return dict;
}

- (void)startLiveActivity:(JS::NativeLiftosaurLiveActivity::LiveActivityState &)state
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurLiveActivityImpl shared] startWithState:DictFromState(state)];
  resolve(nil);
}

- (void)updateLiveActivity:(JS::NativeLiftosaurLiveActivity::LiveActivityState &)state
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurLiveActivityImpl shared] updateWithState:DictFromState(state)];
  resolve(nil);
}

- (void)endLiveActivity:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurLiveActivityImpl shared] end];
  resolve(nil);
}

- (NSNumber *)isSupported {
  return @([[LiftosaurLiveActivityImpl shared] isSupported]);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurLiveActivitySpecJSI>(params);
}

@end
