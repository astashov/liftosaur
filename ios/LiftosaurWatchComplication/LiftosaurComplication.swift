import WidgetKit
import SwiftUI

struct LiftosaurComplicationEntry: TimelineEntry {
    let date: Date
    let info: ComplicationInfo?
}

struct LiftosaurComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> LiftosaurComplicationEntry {
        LiftosaurComplicationEntry(
            date: Date(),
            info: ComplicationInfo(isOngoing: false, programName: "Liftosaur", dayName: "Day 1")
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LiftosaurComplicationEntry) -> Void) {
        completion(LiftosaurComplicationEntry(date: Date(), info: ComplicationStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LiftosaurComplicationEntry>) -> Void) {
        // Static launcher complication — refreshed explicitly by the watch app when the workout changes.
        let entry = LiftosaurComplicationEntry(date: Date(), info: ComplicationStore.load())
        completion(Timeline(entries: [entry], policy: .never))
    }
}

// The container background well looks right behind circular/rectangular, but in a
// corner slot it renders as a stray gray square, so keep it transparent there.
struct ComplicationBackground: View {
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular, .accessoryRectangular:
            AccessoryWidgetBackground()
        default:
            Color.clear
        }
    }
}

struct LiftosaurComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let info: ComplicationInfo?

    private var dino: some View {
        Image("dino")
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .widgetAccentable()
    }

    private var brandRow: some View {
        HStack(spacing: 6) {
            dino
                .frame(width: 24, height: 24)
            Text("Liftosaur")
                .font(.headline)
            Spacer(minLength: 0)
        }
        .widgetAccentable()
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            dino
                .padding(8)
        case .accessoryCorner:
            // The corner slot rejects raster images (renders a placeholder square),
            // so use the custom SF Symbol, with the day name as the curved label.
            Image("DinoSymbol")
                .resizable()
                .scaledToFit()
                .frame(width: 26, height: 26)
                .widgetAccentable()
                .widgetLabel(info?.dayName ?? "Liftosaur")
        case .accessoryInline:
            Label {
                if let info = info {
                    Text(info.dayName)
                } else {
                    Text("Liftosaur")
                }
            } icon: {
                // accessoryInline only renders SF Symbols, not raster images,
                // so use the custom-symbol dino here.
                Image("DinoSymbol")
            }
        case .accessoryRectangular:
            if let info = info {
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 3) {
                        dino
                            .frame(width: 16, height: 16)
                        Text(info.isOngoing ? "Ongoing" : "Up Next")
                            .font(.system(.caption2, design: .rounded).weight(.semibold))
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(.secondary)
                    .widgetAccentable()
                    Text(info.programName)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    Text(info.dayName)
                        .font(.system(.caption2, design: .rounded).weight(.semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                brandRow
            }
        default:
            dino
        }
    }
}

struct LiftosaurComplication: Widget {
    let kind: String = "LiftosaurComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LiftosaurComplicationProvider()) { entry in
            LiftosaurComplicationView(info: entry.info)
                .containerBackground(for: .widget) {
                    ComplicationBackground()
                }
        }
        .configurationDisplayName("Liftosaur")
        .description("Open Liftosaur to start or continue your workout.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryInline,
            .accessoryRectangular,
        ])
    }
}
