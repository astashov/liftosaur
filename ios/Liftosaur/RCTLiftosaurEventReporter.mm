#import "RCTLiftosaurEventReporter.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"
#import <sys/utsname.h>

static __weak RCTLiftosaurEventReporter *gCodegenWiredInstance = nil;

@implementation RCTLiftosaurEventReporter {
  BOOL _eventEmitterWired;
}

RCT_EXPORT_MODULE(LiftosaurEventReporter)

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
  [[LiftosaurEventReporterImpl shared] setEventEmitter:^(NSDictionary *event) {
    RCTLiftosaurEventReporter *target = gCodegenWiredInstance;
    if (target == nil) return;
    [target emitOnTelemetryEvent:event];
  }];
}

- (void)getLastTerminationInfo:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
  NSDictionary *info = [[LiftosaurEventReporterImpl shared] consumeLastTerminationInfo];
  resolve(info);
}

- (void)flushPendingTelemetry:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurEventReporterImpl shared] flushPending];
  resolve(nil);
}

- (NSString *)getAppVersion {
  NSString *version = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"];
  return version ?: @"0";
}

- (NSString *)getDeviceModel {
  struct utsname systemInfo;
  uname(&systemInfo);
  return [NSString stringWithCString:systemInfo.machine encoding:NSUTF8StringEncoding] ?: @"";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurEventReporterSpecJSI>(params);
}

@end
