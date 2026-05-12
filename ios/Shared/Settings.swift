import Foundation

#if DEBUG
// let baseUrl = URL(string: "liftosaur://www.liftosaur.com")!
let baseUrl = URL(string: "liftosaur://local.liftosaur.com:8080")!
// let baseUrl = URL(string: "liftosaur://stage.liftosaur.com")!

// let baseApiUrl = URL(string: "https://api3.liftosaur.com")!
let baseApiUrl = URL(string: "https://local-api.liftosaur.com:3000")!
// let baseApiUrl = URL(string: "https://api3-dev.liftosaur.com")!

// let baseImageUrl = URL(string: "https://www.liftosaur.com")!
let baseImageUrl = URL(string: "https://local.liftosaur.com:8080")!
// let baseImageUrl = URL(string: "https://stage.liftosaur.com")!
#else
let baseUrl = URL(string: "liftosaur://www.liftosaur.com")!
let baseApiUrl = URL(string: "https://api3.liftosaur.com")!
let baseImageUrl = URL(string: "https://www.liftosaur.com")!
#endif

let rollbarAccessToken = "d37f0af379b741a7b0b0fcc6b9e9a673"
#if DEBUG
let rollbarEnvironment = "ios-dev"
#else
let rollbarEnvironment = "ios"
#endif

let iosAppVersion = 13
