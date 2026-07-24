#import "RCTLiftosaurImageResizer.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

@implementation RCTLiftosaurImageResizer

RCT_EXPORT_MODULE(LiftosaurImageResizer)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)getSize:(NSString *)uri
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurImageResizerImpl shared] getSizeWithUri:uri
                                          completion:^(double width, double height, NSString * _Nullable error) {
    if (error) {
      reject(@"getsize_failed", error, nil);
    } else {
      resolve(@{@"width": @(width), @"height": @(height)});
    }
  }];
}

- (void)drawToCanvas:(NSString *)uri
         canvasWidth:(double)canvasWidth
        canvasHeight:(double)canvasHeight
               destX:(double)destX
               destY:(double)destY
           destWidth:(double)destWidth
          destHeight:(double)destHeight
              format:(NSString *)format
             quality:(double)quality
     backgroundColor:(double)backgroundColor
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurImageResizerImpl shared] drawToCanvasWithUri:uri
                                              canvasWidth:canvasWidth
                                             canvasHeight:canvasHeight
                                                    destX:destX
                                                    destY:destY
                                                destWidth:destWidth
                                               destHeight:destHeight
                                                   format:format
                                                  quality:quality
                                          backgroundColor:backgroundColor
                                               completion:^(NSString * _Nullable resultUri, NSString * _Nullable error) {
    if (error) {
      reject(@"draw_failed", error, nil);
    } else {
      resolve(resultUri);
    }
  }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurImageResizerSpecJSI>(params);
}

@end
