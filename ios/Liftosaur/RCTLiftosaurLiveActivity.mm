#import "RCTLiftosaurLiveActivity.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import <ExpoModulesCore/ExpoModulesCore-Swift.h>
#import <Expo/Expo-Swift.h>
#import "Liftosaur-Swift.h"

static __weak RCTLiftosaurLiveActivity *gCodegenWiredInstance = nil;

@implementation RCTLiftosaurLiveActivity {
  BOOL _eventEmitterWired;
}

RCT_EXPORT_MODULE(LiftosaurLiveActivity)

- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)wrapper {
  [super setEventEmitterCallback:wrapper];
  gCodegenWiredInstance = self;
  [self wireEventEmitterIfNeeded];
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

static NSArray *CompletedSetsArray(JS::NativeLiftosaurLiveActivity::LiveActivityEntry *entry) {
  NSMutableArray *out = [NSMutableArray array];
  auto sets = entry->completedSets();
  for (size_t i = 0, n = sets.size(); i < n; i++) {
    auto set = sets[i];
    [out addObject:@{
      @"status": set.status() ?: @"not-finished",
      @"isWarmup": @(set.isWarmup()),
    }];
  }
  return out;
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
    e[@"completedSets"] = CompletedSetsArray(&entry.value());
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

- (void)wireEventEmitterIfNeeded {
  if (_eventEmitterWired) return;
  _eventEmitterWired = YES;
  [[LiftosaurLiveActivityImpl shared] setEventEmitter:^(NSDictionary *event) {
    RCTLiftosaurLiveActivity *target = gCodegenWiredInstance;
    if (target == nil) return;
    [target emitOnLiveActivityAction:event];
  }];
}

- (void)startLiveActivity:(JS::NativeLiftosaurLiveActivity::LiveActivityState &)state
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurLiveActivityImpl shared] startWithState:DictFromState(state)];
  resolve(nil);
}

- (void)updateLiveActivity:(JS::NativeLiftosaurLiveActivity::LiveActivityState &)state
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
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

- (void)flushPendingActions:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
  resolve(nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurLiveActivitySpecJSI>(params);
}

@end
