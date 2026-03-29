#import "RCTLiftosaurStorage.h"
#import <React/RCTBridgeModule.h>
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "LiftosaurNative-Swift.h"

@implementation RCTLiftosaurStorage

RCT_EXPORT_MODULE(LiftosaurStorage)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)getValue:(NSString *)key
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurStorageImpl shared] getValue:key completion:^(NSString *value) {
    resolve(value ?: [NSNull null]);
  }];
}

- (void)setValue:(NSString *)key
           value:(NSString *)value
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurStorageImpl shared] setValue:key value:value completion:^(BOOL success) {
    resolve(@(success));
  }];
}

- (void)deleteValue:(NSString *)key
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurStorageImpl shared] deleteValue:key completion:^(BOOL success) {
    resolve(@(success));
  }];
}

- (void)hasValue:(NSString *)key
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurStorageImpl shared] hasValue:key completion:^(BOOL success) {
    resolve(@(success));
  }];
}

- (void)getAllKeys:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurStorageImpl shared] getAllKeys:^(NSArray<NSString *> *keys) {
    resolve(keys);
  }];
}

- (void)readFile:(NSString *)path
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurStorageImpl shared] readFile:path completion:^(NSString *value) {
    resolve(value ?: [NSNull null]);
  }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurStorageSpecJSI>(params);
}

@end
