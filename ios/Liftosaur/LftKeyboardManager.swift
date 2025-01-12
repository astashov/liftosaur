//
//  LftKeyboardManager.swift
//  Liftosaur
//
//  Created by Anton Astashov on 1/11/25.
//

import Foundation
import React

@objc(LftKeyboardManager)
class LftKeyboardManager: NSObject {
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc func showKeyboard() {
    DispatchQueue.main.async {
      if let topVC = UIApplication.shared.keyWindow?.rootViewController {
        topVC.view.endEditing(true)
      }
    }
  }
  
}
