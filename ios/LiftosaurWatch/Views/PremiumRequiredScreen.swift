//
//  PremiumRequiredScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

struct PremiumRequiredScreen: View {
    let isSyncing: Bool
    let onSync: () -> Void

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "crown.fill")
                .font(.system(size: 40))
                .foregroundColor(LiftosaurColor.yellow400)

            Text("Premium Required")
                .font(.headline)
                .foregroundColor(LiftosaurColor.textPrimary)

            Text("Get Premium on iPhone to use the Watch app")
                .font(.caption)
                .foregroundColor(LiftosaurColor.textSecondary)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)

            Button {
                onSync()
            } label: {
                if isSyncing {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Label("Recheck", systemImage: "arrow.triangle.2.circlepath")
                }
            }
            .disabled(isSyncing)
        }
        .padding()
    }
}

#Preview {
    PremiumRequiredScreen(isSyncing: false, onSync: {})
}
