#import "RCTNativeNumKeyboard.h"
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>
#import <React/RCTRootView.h>
#import <React/RCTTextInputComponentView.h>
#import <React/RCTUITextField.h>

@interface RCTNativeNumKeyboard() {
  RCTUITextField *_textField;
}
@end

@implementation RCTNativeNumKeyboard
RCT_EXPORT_MODULE(NativeNumKeyboard)

@synthesize bridge = _bridge;

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeNumKeyboardSpecJSI>(params);
}

-(void)showKeyboard:(NSNumber *)reactTag {
  dispatch_async(dispatch_get_main_queue(), ^{
    RCTTextInputComponentView *wrapperField = [self.bridge.uiManager viewForReactTag:reactTag];
    RCTUITextField *textField = wrapperField.subviews[0];
    self->_textField = textField;
    NSLog(@"Received native UITextField: %@", textField);
      
    // Create your custom keyboard view
    UIView *customKeyboardView = [
      [UIView alloc]
      initWithFrame:CGRectMake(0, 0, UIScreen.mainScreen.bounds.size.width, 250)
    ];
    customKeyboardView.backgroundColor = [UIColor lightGrayColor];
    
    // Add buttons to insert text
    UIButton *buttonA = [UIButton buttonWithType:UIButtonTypeSystem];
    buttonA.frame = CGRectMake(20, 20, 50, 40);
    [buttonA setTitle:@"2" forState:UIControlStateNormal];
    [buttonA addTarget:self action:@selector(insertText:) forControlEvents:UIControlEventTouchUpInside];
    [customKeyboardView addSubview:buttonA];

    UIButton *buttonB = [UIButton buttonWithType:UIButtonTypeSystem];
    buttonB.frame = CGRectMake(80, 20, 50, 40);
    [buttonB setTitle:@"3" forState:UIControlStateNormal];
    [buttonB addTarget:self action:@selector(insertText:) forControlEvents:UIControlEventTouchUpInside];
    [customKeyboardView addSubview:buttonB];

    UIButton *doneButton = [UIButton buttonWithType:UIButtonTypeSystem];
    doneButton.frame = CGRectMake(customKeyboardView.frame.size.width - 100, 10, 80, 40);
    [doneButton setTitle:@"Done" forState:UIControlStateNormal];
    [doneButton addTarget:self action:@selector(dismissKeyboard:) forControlEvents:UIControlEventTouchUpInside];

    [customKeyboardView addSubview:doneButton];

    // Set custom keyboard as inputView
    textField.inputView = customKeyboardView;

    // Refresh input view
    [textField reloadInputViews];
  });
}

// Method to insert text
- (void)insertText:(UIButton *)sender {
  if (_textField) {
    NSString *newText = [_textField.attributedText.string stringByAppendingString:sender.titleLabel.attributedText.string];
    _textField.attributedText = [[NSAttributedString alloc] initWithString:newText];
    [_textField sendActionsForControlEvents:UIControlEventEditingChanged];
  }
}

// Method to dismiss keyboard
- (void)dismissKeyboard:(UIButton *)sender {
  [[UIApplication sharedApplication].keyWindow endEditing:YES];
}

@end
