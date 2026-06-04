#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

// Registers the app-local FastText Fabric component with the component view factory.
// The codegen `RCTThirdPartyComponentsProvider` only covers node_modules libraries, so an
// app-local component must be registered explicitly. Safe to call before startReactNative;
// the factory is a persistent singleton shared with the component view registry.
@interface RCTFastTextRegistrar : NSObject
+ (void)registerComponent;
@end

NS_ASSUME_NONNULL_END
