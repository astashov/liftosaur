import Foundation
import UIKit
import Photos
import TikTokOpenShareSDK

@objc class LiftosaurShareImpl: NSObject {
  @objc static let shared = LiftosaurShareImpl()

  private static let igAppId = "3448767138535273"
  private static let tiktokRedirectURI = "https://www.liftosaur.com/app"

  private func loadImage(_ path: String) -> UIImage? {
    if path.hasPrefix("data:") {
      guard let commaIdx = path.firstIndex(of: ",") else { return nil }
      let base64 = String(path[path.index(after: commaIdx)...])
      guard let data = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) else { return nil }
      return UIImage(data: data)
    }
    let trimmed = path.hasPrefix("file://") ? String(path.dropFirst("file://".count)) : path
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: trimmed)) else { return nil }
    return UIImage(data: data)
  }

  private func defaultBackgroundImage() -> UIImage? {
    return UIImage(named: "workoutsharebg") ?? UIImage(named: "background")
  }

  @objc func shareToIGStory(workoutImagePath: String, backgroundImagePath: String?, completion: @escaping (String?) -> Void) {
    guard let urlScheme = URL(string: "instagram-stories://share?source_application=\(Self.igAppId)") else {
      completion("Invalid Instagram URL scheme")
      return
    }
    guard let workoutImage = loadImage(workoutImagePath), let workoutData = workoutImage.pngData() else {
      completion("Failed to load workout image")
      return
    }

    let backgroundImage: UIImage? = {
      if let bgPath = backgroundImagePath, !bgPath.isEmpty {
        return loadImage(bgPath)
      }
      return defaultBackgroundImage()
    }()
    let backgroundData = backgroundImage?.jpegData(compressionQuality: 0.95)

    DispatchQueue.main.async {
      guard UIApplication.shared.canOpenURL(urlScheme) else {
        completion("Instagram is not installed")
        return
      }

      var item: [String: Any] = ["com.instagram.sharedSticker.stickerImage": workoutData]
      if let backgroundData {
        item["com.instagram.sharedSticker.backgroundImage"] = backgroundData
      }
      let pasteboardItems: [[String: Any]] = [item]
      let expirationDate = Date().addingTimeInterval(60 * 5)
      let pasteboardOptions: [UIPasteboard.OptionsKey: Any] = [.expirationDate: expirationDate]
      UIPasteboard.general.setItems(pasteboardItems, options: pasteboardOptions)
      UIApplication.shared.open(urlScheme, options: [:], completionHandler: nil)
      completion(nil)
    }
  }

  @objc func shareToIGFeed(workoutImagePath: String, completion: @escaping (String?) -> Void) {
    Task {
      do {
        let localIdentifier = try await self.saveImageToPhotoLibrary(path: workoutImagePath)
        let assetUrl = "assets-library://asset/asset.JPG?id=\(localIdentifier)&ext=JPG"
        guard let encoded = assetUrl.addingPercentEncoding(withAllowedCharacters: .alphanumerics) else {
          completion("Failed to encode asset URL")
          return
        }
        let urlString = "instagram://library?AssetPath=\(encoded)&Destination=Feed"
        guard let url = URL(string: urlString) else {
          completion("Invalid Instagram URL")
          return
        }
        DispatchQueue.main.async {
          guard UIApplication.shared.canOpenURL(url) else {
            completion("Instagram is not installed")
            return
          }
          UIApplication.shared.open(url, options: [:], completionHandler: nil)
          completion(nil)
        }
      } catch {
        completion(error.localizedDescription)
      }
    }
  }

  @objc func shareToTiktok(workoutImagePath: String, completion: @escaping (String?) -> Void) {
    Task {
      do {
        let localIdentifier = try await self.saveImageToPhotoLibrary(path: workoutImagePath)
        let shareRequest = TikTokShareRequest(
          localIdentifiers: [localIdentifier],
          mediaType: .image,
          redirectURI: Self.tiktokRedirectURI
        )
        DispatchQueue.main.async {
          shareRequest.send { _ in }
          completion(nil)
        }
      } catch {
        completion(error.localizedDescription)
      }
    }
  }

  private func saveImageToPhotoLibrary(path: String) async throws -> String {
    guard let image = loadImage(path) else {
      throw NSError(domain: "LiftosaurShare", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
    }
    let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
    guard status == .authorized else {
      throw NSError(domain: "LiftosaurShare", code: 1, userInfo: [NSLocalizedDescriptionKey: "Photos access not authorized"])
    }
    return try await withCheckedThrowingContinuation { continuation in
      var localIdentifier: String?
      PHPhotoLibrary.shared().performChanges({
        let creation = PHAssetChangeRequest.creationRequestForAsset(from: image)
        localIdentifier = creation.placeholderForCreatedAsset?.localIdentifier
      }) { success, error in
        if success, let id = localIdentifier {
          continuation.resume(returning: id)
        } else {
          continuation.resume(throwing: error ?? NSError(domain: "LiftosaurShare", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to save photo"]))
        }
      }
    }
  }
}
