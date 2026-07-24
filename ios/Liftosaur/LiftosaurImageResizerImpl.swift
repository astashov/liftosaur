import Foundation
import ImageIO
import UIKit

@objc class LiftosaurImageResizerImpl: NSObject {
  @objc static let shared = LiftosaurImageResizerImpl()

  private func createImageSource(_ path: String) -> CGImageSource? {
    if path.hasPrefix("data:") {
      guard let commaIdx = path.firstIndex(of: ",") else { return nil }
      let base64 = String(path[path.index(after: commaIdx)...])
      guard let data = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) else { return nil }
      return CGImageSourceCreateWithData(data as CFData, nil)
    }
    let trimmed = path.hasPrefix("file://") ? String(path.dropFirst("file://".count)) : path
    let decoded = trimmed.removingPercentEncoding ?? trimmed
    return CGImageSourceCreateWithURL(URL(fileURLWithPath: decoded) as CFURL, nil)
  }

  @objc func getSize(uri: String, completion: @escaping (Double, Double, String?) -> Void) {
    DispatchQueue.global(qos: .userInitiated).async {
      // Read dimensions from metadata without decoding pixels into memory.
      guard let source = self.createImageSource(uri),
            let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
            let pixelWidth = props[kCGImagePropertyPixelWidth] as? Double,
            let pixelHeight = props[kCGImagePropertyPixelHeight] as? Double else {
        completion(0, 0, "Failed to load image")
        return
      }
      // EXIF orientations 5...8 are the 90/270 (transposed) cases that swap width and height.
      let orientation = (props[kCGImagePropertyOrientation] as? Int) ?? 1
      let swap = orientation >= 5
      completion(swap ? pixelHeight : pixelWidth, swap ? pixelWidth : pixelHeight, nil)
    }
  }

  @objc func drawToCanvas(
    uri: String,
    canvasWidth: Double,
    canvasHeight: Double,
    destX: Double,
    destY: Double,
    destWidth: Double,
    destHeight: Double,
    format: String,
    quality: Double,
    backgroundColor: Double,
    completion: @escaping (String?, String?) -> Void
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      // Decode a downsampled, EXIF-oriented thumbnail sized to the draw target instead of the full image,
      // so a large camera photo doesn't allocate a full-res bitmap before we shrink it.
      let maxPixelSize = max(1, Int(max(destWidth, destHeight).rounded()))
      let thumbnailOptions: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxPixelSize,
      ]
      guard let source = self.createImageSource(uri),
            let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbnailOptions as CFDictionary) else {
        completion(nil, "Failed to load image")
        return
      }
      let image = UIImage(cgImage: cgImage)

      let isPng = format.lowercased() == "png"
      let rendererFormat = UIGraphicsImageRendererFormat.default()
      rendererFormat.scale = 1
      // Render with alpha so a transparent backgroundColor stays transparent in png output.
      rendererFormat.opaque = false
      let canvasSize = CGSize(width: canvasWidth, height: canvasHeight)
      let renderer = UIGraphicsImageRenderer(size: canvasSize, format: rendererFormat)
      let argb = UInt32(min(max(backgroundColor, 0), 4294967295))
      let output = renderer.image { context in
        let alpha = CGFloat((argb >> 24) & 0xFF) / 255.0
        if alpha > 0 {
          let red = CGFloat((argb >> 16) & 0xFF) / 255.0
          let green = CGFloat((argb >> 8) & 0xFF) / 255.0
          let blue = CGFloat(argb & 0xFF) / 255.0
          UIColor(red: red, green: green, blue: blue, alpha: alpha).setFill()
          context.fill(CGRect(origin: .zero, size: canvasSize))
        }
        image.draw(in: CGRect(x: destX, y: destY, width: destWidth, height: destHeight))
      }

      guard let data = isPng ? output.pngData() : output.jpegData(compressionQuality: CGFloat(quality)) else {
        completion(nil, "Failed to encode image")
        return
      }
      let ext = isPng ? "png" : "jpg"
      let outputURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("liftosaur-resized-\(UUID().uuidString).\(ext)")
      do {
        try data.write(to: outputURL)
        completion(outputURL.absoluteString, nil)
      } catch {
        completion(nil, "Failed to write image: \(error.localizedDescription)")
      }
    }
  }
}
