#import "RCTLftUpdater.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

@implementation RCTLftUpdater

RCT_EXPORT_MODULE(LftUpdater)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)checkAndDownload:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [[LftUpdater shared] checkAndDownloadWithCompletion:^(NSString * _Nonnull resultJSON) {
    NSData *data = [resultJSON dataUsingEncoding:NSUTF8StringEncoding];
    NSError *err = nil;
    id obj = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:&err] : nil;
    if (err || !obj) {
      reject(@"ota_error", @"failed to parse result JSON", err);
    } else {
      resolve(obj);
    }
  }];
}

- (void)markLaunchSuccessful:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
  [[LftUpdater shared] markLaunchSuccessful];
  resolve(nil);
}

- (void)activeBundleId:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
  resolve([[LftUpdater shared] activeBundleId]);
}

- (void)revertToEmbedded:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [[LftUpdater shared] revertToEmbedded];
  resolve(nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLftUpdaterSpecJSI>(params);
}

@end
