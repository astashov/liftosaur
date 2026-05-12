//
//  ContentView.swift
//  LiftosaurWatch Watch App
//
//  Created by Anton Astashov on 1/3/26.
//

import SwiftUI
import OSLog

// Sheet shown when all sets are completed
struct AllSetsCompletedSheet: View {
    @Binding var isFinishing: Bool
    let onFinish: () -> Void
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("All Sets Completed!")
                .font(.headline)
                .foregroundColor(LiftosaurColor.textPrimary)

            Spacer().frame(height: 8)

            Button(action: onFinish) {
                if isFinishing {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Finish Workout")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(LiftosaurColor.purple500)
            .disabled(isFinishing)

            Button("Continue", action: onContinue)
                .disabled(isFinishing)
        }
        .padding()
    }
}

// Sync indicator - shows in toolbar when syncing
struct SyncIndicatorView: View {
    let status: WatchSyncManager.SyncStatus

    var body: some View {
        Group {
            switch status {
            case .syncing, .pending:
                ProgressView()
                    .scaleEffect(0.7)
                    .frame(width: 12, height: 12)
            case .error:
                Image(systemName: "exclamationmark.icloud")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.red)
            case .synced:
                EmptyView()
            }
        }
    }
}

struct ContentView: View {
    @StateObject private var workoutManager = WorkoutManager.shared
    @State private var showDiscardAlert = false
    @State private var showWorkoutExercises = false
    @State private var selectedExerciseIndex: Int? = nil
    @State private var finishWorkoutSummary: WatchFinishWorkoutSummary? = nil
    @State private var showHealthConfirmation = false
    @State private var pendingHealthSettings: WatchHealthSettings? = nil
    @State private var showAllSetsCompletedSheet = false
    @State private var isFinishingFromSheet = false

    var body: some View {
        NavigationStack {
            Group {
                if workoutManager.isLoading {
                    ProgressView()
                } else if !workoutManager.hasSubscription {
                    PremiumRequiredScreen(
                        isSyncing: workoutManager.isSyncing,
                        onSync: {
                            Task {
                                WatchConnectivityManager.shared.requestAuth()
                                await workoutManager.manualSync()
                            }
                        }
                    )
                } else if let error = workoutManager.error {
                    if error == "No storage found" {
                        VStack(spacing: 8) {
                            Text("Sync Required")
                                .font(.headline)
                                .foregroundColor(LiftosaurColor.textPrimary)
                            Text("Open Liftosaur on your iPhone to sync your workout data")
                                .font(.caption)
                                .foregroundColor(LiftosaurColor.textSecondary)
                                .multilineTextAlignment(.center)
                                .lineLimit(3)
                                .fixedSize(horizontal: false, vertical: true)
                            Button {
                                Task {
                                    WatchConnectivityManager.shared.requestAuth()
                                    await workoutManager.manualSync()
                                }
                            } label: {
                                if workoutManager.isSyncing {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                } else {
                                    Label("Sync", systemImage: "arrow.triangle.2.circlepath")
                                }
                            }
                            .disabled(workoutManager.isSyncing)
                        }
                        .padding()
                    } else {
                        VStack(spacing: 8) {
                            Text("Error")
                                .font(.headline)
                                .foregroundColor(LiftosaurColor.textError)
                            Text(error)
                                .font(.caption)
                                .foregroundColor(LiftosaurColor.textSecondary)
                                .multilineTextAlignment(.center)
                            Button("Retry") {
                                Task {
                                    await workoutManager.initialize()
                                }
                            }
                        }
                        .padding()
                    }
                } else if let workout = workoutManager.activeWorkout ?? workoutManager.currentWorkout {
                    let isOngoing = workoutManager.activeWorkout != nil
                    HomeScreen(
                        dayName: workout.dayName,
                        programName: workout.programName,
                        exercises: workout.exercises,
                        isOngoing: isOngoing,
                        isStartingWorkout: workoutManager.isStartingWorkout,
                        heartRate: workoutManager.heartRate,
                        isSyncing: workoutManager.isSyncing && !workoutManager.isLoading,
                        storageDate: workoutManager.storageDate,
                        onStart: {
                            if !isOngoing {
                                await workoutManager.startWorkout()
                            }
                            showWorkoutExercises = true
                        },
                        onRefresh: {
                            await workoutManager.manualSync()
                        }
                    )
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Image("dino")
                                .renderingMode(.template)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 24, height: 24)
                                .foregroundColor(AuthManager.shared.isAuthenticated ? .green : .red)
                        }
                    }
                    .navigationDestination(isPresented: $showWorkoutExercises) {
                        if let activeWorkout = workoutManager.activeWorkout {
                            WorkoutExercisesScreen(
                                workout: activeWorkout,
                                isPaused: workoutManager.isPaused,
                                workoutTime: workoutManager.workoutTime,
                                heartRate: workoutManager.heartRate,
                                isFinishingWorkout: workoutManager.isFinishingWorkout,
                                onFinish: {
                                    Task { @MainActor in
                                        let healthSettings = await workoutManager.getHealthSettings()
                                        if let settings = healthSettings, settings.appleHealthSyncWorkout, settings.healthConfirmation {
                                            pendingHealthSettings = settings
                                            showHealthConfirmation = true
                                        } else {
                                            let saveToHealth = healthSettings?.appleHealthSyncWorkout ?? false
                                            finishWorkoutSummary = await workoutManager.finishWorkout(saveToHealth: saveToHealth)
                                        }
                                    }
                                },
                                onDiscard: {
                                    showDiscardAlert = true
                                },
                                onExerciseTap: { index in
                                    selectedExerciseIndex = index
                                },
                                onPauseToggle: {
                                    Task { await workoutManager.togglePauseWorkout() }
                                },
                                onRefreshTime: {
                                    workoutManager.refreshWorkoutTime()
                                },
                                onRefresh: {
                                    await workoutManager.manualSync()
                                }
                            )
                            .alert("Discard Workout?", isPresented: $showDiscardAlert) {
                                Button("Cancel", role: .cancel) { }
                                Button("Discard", role: .destructive) {
                                    Logger.workout.info(" Discard button tapped, starting Task")
                                    Task { @MainActor in
                                        Logger.workout.info(" Task started, calling discardWorkout()")
                                        await workoutManager.discardWorkout()
                                        Logger.workout.info(" discardWorkout() returned, setting showWorkoutExercises = false")
                                        showWorkoutExercises = false
                                        Logger.workout.info(" showWorkoutExercises set to false")
                                    }
                                }
                            } message: {
                                Text("Are you sure you want to discard this workout?")
                            }
                            .navigationDestination(item: $selectedExerciseIndex) { index in
                                ExerciseScreen(
                                    initialExerciseIndex: index,
                                    startTime: workoutManager.workoutStartTime,
                                    heartRate: workoutManager.heartRate,
                                    isCompletingSet: workoutManager.isCompletingSet,
                                    onComplete: { entryIndex, setIndex, reps, weight in
                                        await workoutManager.completeSet(entryIndex: entryIndex, setIndex: setIndex)
                                    },
                                    onGetNextEntryAndSetIndex: { entryIndex, setIndex in
                                        await workoutManager.getNextEntryAndSetIndex(entryIndex: entryIndex, setIndex: setIndex)
                                    },
                                    onGetValidWeights: { entryIndex, currentWeight, unit in
                                        await workoutManager.getValidWeights(entryIndex: entryIndex, currentWeight: currentWeight, unit: unit)
                                    },
                                    onUpdateReps: { entryIndex, setIndex, reps in
                                        await workoutManager.updateSetReps(entryIndex: entryIndex, setIndex: setIndex, reps: reps)
                                    },
                                    onUpdateRepsLeft: { entryIndex, setIndex, repsLeft in
                                        await workoutManager.updateSetRepsLeft(entryIndex: entryIndex, setIndex: setIndex, repsLeft: repsLeft)
                                    },
                                    onUpdateWeight: { entryIndex, setIndex, weight in
                                        await workoutManager.updateSetWeight(entryIndex: entryIndex, setIndex: setIndex, weight: weight)
                                    },
                                    onGetAmrapModal: {
                                        await workoutManager.getAmrapModal()
                                    },
                                    onCompleteSetWithAmrap: { reps, repsLeft, weight, rpe, userVars in
                                        await workoutManager.completeSetWithAmrap(
                                            completedReps: reps,
                                            completedRepsLeft: repsLeft,
                                            completedWeight: weight,
                                            completedRpe: rpe,
                                            userPromptedVars: userVars
                                        )
                                    },
                                    restTimer: workoutManager.restTimer,
                                    onAdjustRestTimer: { adjustment in
                                        await workoutManager.adjustRestTimer(adjustment: adjustment)
                                    },
                                    onStopRestTimer: {
                                        await workoutManager.stopRestTimer()
                                    },
                                    onAddSet: { entryIndex in
                                        await workoutManager.addSet(entryIndex: entryIndex)
                                    },
                                    onDeleteSet: { entryIndex, setIndex in
                                        await workoutManager.deleteSet(entryIndex: entryIndex, setIndex: setIndex)
                                    },
                                    onBack: {
                                        selectedExerciseIndex = nil
                                    },
                                    onAllSetsCompleted: {
                                        showAllSetsCompletedSheet = true
                                    }
                                )
                                .sheet(isPresented: $showAllSetsCompletedSheet) {
                                    AllSetsCompletedSheet(
                                        isFinishing: $isFinishingFromSheet,
                                        onFinish: {
                                            isFinishingFromSheet = true
                                            Task { @MainActor in
                                                let healthSettings = await workoutManager.getHealthSettings()
                                                if let settings = healthSettings, settings.appleHealthSyncWorkout, settings.healthConfirmation {
                                                    pendingHealthSettings = settings
                                                    isFinishingFromSheet = false
                                                    showAllSetsCompletedSheet = false
                                                    showHealthConfirmation = true
                                                } else {
                                                    let saveToHealth = healthSettings?.appleHealthSyncWorkout ?? false
                                                    let summary = await workoutManager.finishWorkout(saveToHealth: saveToHealth)
                                                    isFinishingFromSheet = false
                                                    showAllSetsCompletedSheet = false
                                                    finishWorkoutSummary = summary
                                                }
                                            }
                                        },
                                        onContinue: {
                                            showAllSetsCompletedSheet = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                } else {
                    VStack(spacing: 8) {
                        Text("No Program")
                            .font(.headline)
                            .foregroundColor(LiftosaurColor.textPrimary)
                        Text("Open Liftosaur on your phone to set up a program")
                            .font(.caption)
                            .foregroundColor(LiftosaurColor.textSecondary)
                            .multilineTextAlignment(.center)
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                        Button {
                            Task {
                                WatchConnectivityManager.shared.requestAuth()
                                await workoutManager.manualSync()
                            }
                        } label: {
                            if workoutManager.isSyncing {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Label("Sync", systemImage: "arrow.triangle.2.circlepath")
                            }
                        }
                        .disabled(workoutManager.isSyncing)
                    }
                    .padding()
                }
            }
        }
        .fullScreenCover(item: $finishWorkoutSummary) { summary in
            FinishWorkoutScreen(
                summary: summary,
                onClose: {
                    Task { @MainActor in
                        await workoutManager.finishWorkoutContinue()
                        finishWorkoutSummary = nil
                        showWorkoutExercises = false
                        await workoutManager.loadNextWorkout()
                    }
                }
            )
        }
        .alert("Sync to Apple Health?", isPresented: $showHealthConfirmation) {
            Button("Sync") {
                Task { @MainActor in
                    finishWorkoutSummary = await workoutManager.finishWorkout(saveToHealth: true)
                    pendingHealthSettings = nil
                }
            }
            Button("Don't Sync", role: .cancel) {
                Task { @MainActor in
                    finishWorkoutSummary = await workoutManager.finishWorkout(saveToHealth: false)
                    pendingHealthSettings = nil
                }
            }
        } message: {
            Text("Do you want to sync this workout to Apple Health?")
        }
        .onChange(of: workoutManager.activeWorkout == nil) { _, isNil in
            // When activeWorkout becomes nil (e.g., workout finished on phone),
            // pop back to home screen to avoid showing empty workout view
            // Don't dismiss if we're finishing from the sheet - we'll navigate properly after getting the summary
            if isNil && showWorkoutExercises && finishWorkoutSummary == nil && !isFinishingFromSheet {
                showWorkoutExercises = false
                selectedExerciseIndex = nil
            }
        }
    }
}

#Preview {
    ContentView()
}
