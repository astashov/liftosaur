//
//  FlowLayout.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

@available(iOS 16.0, watchOS 9.0, *)
struct FlowLayout: Layout {
    var spacing: CGFloat = 2
    var maxLines: Int? = nil

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing, maxLines: maxLines)
        return CGSize(width: proposal.width ?? 0, height: result.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing, maxLines: maxLines)
        for (index, position) in result.positions.enumerated() {
            if let pos = position {
                subviews[index].place(at: CGPoint(x: bounds.minX + pos.x, y: bounds.minY + pos.y), proposal: .unspecified)
            } else {
                subviews[index].place(at: CGPoint(x: -10000, y: -10000), proposal: .zero)
            }
        }
    }

    struct FlowResult {
        var positions: [CGPoint?] = []
        var height: CGFloat = 0
        var isTruncated: Bool = false

        init(in containerWidth: CGFloat, subviews: Subviews, spacing: CGFloat, maxLines: Int?) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0
            var currentLine = 1
            var ellipsisSize: CGSize = .zero

            // If we have maxLines, the last subview is the ellipsis indicator
            let hasEllipsis = maxLines != nil && subviews.count > 0
            let contentSubviews = hasEllipsis ? subviews.dropLast() : subviews.dropLast(0)

            if hasEllipsis {
                ellipsisSize = subviews.last!.sizeThatFits(.unspecified)
            }

            for subview in contentSubviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > containerWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                    currentLine += 1
                }

                if let max = maxLines, currentLine > max {
                    positions.append(nil)
                    isTruncated = true
                    continue
                }

                // Check if this item would leave no room for ellipsis on last allowed line
                if let max = maxLines, currentLine == max {
                    let wouldWrap = x + size.width > containerWidth && x > 0
                    if wouldWrap {
                        positions.append(nil)
                        isTruncated = true
                        continue
                    }
                }

                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }

            // Place ellipsis if truncated
            if hasEllipsis {
                if isTruncated {
                    // Find the last visible item on the last line and replace it with ellipsis
                    if let lastVisiblePos = positions.compactMap({ $0 }).last {
                        let ellipsisY = lastVisiblePos.y
                        // Find the last item on the last line
                        var lastItemIndexOnLastLine: Int? = nil
                        for (index, pos) in positions.enumerated() {
                            if let p = pos, p.y == ellipsisY {
                                lastItemIndexOnLastLine = index
                            }
                        }
                        // Hide the last item and place ellipsis at its position
                        if let lastIndex = lastItemIndexOnLastLine, let lastPos = positions[lastIndex] {
                            let ellipsisX = lastPos.x
                            positions[lastIndex] = nil
                            positions.append(CGPoint(x: ellipsisX, y: ellipsisY))
                        } else {
                            positions.append(CGPoint(x: 0, y: 0))
                        }
                    } else {
                        positions.append(CGPoint(x: 0, y: 0))
                    }
                } else {
                    // Hide ellipsis when not truncated
                    positions.append(nil)
                }
            }

            height = y + rowHeight
        }
    }
}
