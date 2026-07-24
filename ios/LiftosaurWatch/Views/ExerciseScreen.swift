//
//  ExerciseScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI
import WatchKit
import OSLog

private let kCrownScale: Double = 2.0
private let kDebounceNs: UInt64 = 1_000_000_000

enum SelectedField {
    case none
    case reps
    case repsLeft
    case weight
}

struct ExerciseScreen: View {
    @StateObject private var workoutManager = WorkoutManager.shared
    let initialExerciseIndex: Int
    let startTime: Date?
    let heartRate: Double?
    let isCompletingSet: Bool
    let onComplete: (Int, Int, Int, Double) async -> Void  // entryIndex, setIndex, reps, weight
    let onGetNextEntryAndSetIndex: (Int, Int) async -> WatchNextEntryAndSetIndex?  // entryIndex, setIndex -> next entry/set
    let onGetValidWeights: (Int, Double, String?) async -> WatchValidWeights?  // entryIndex, currentWeight, unit -> validWeights
    let onUpdateReps: (Int, Int, Int) async -> Void  // entryIndex, setIndex, reps
    let onUpdateRepsLeft: (Int, Int, Int) async -> Void  // entryIndex, setIndex, repsLeft
    let onUpdateWeight: (Int, Int, Double) async -> Void  // entryIndex, setIndex, weight
    let onUpdateCompletedSetTimer: (Int, Int, Int) async -> Void  // entryIndex, setIndex, seconds (<0 clears)
    let onGetAmrapModal: () async -> WatchAmrapModal?
    let onCompleteSetWithAmrap: (Int?, Int?, Double?, Double?, [String: Any]?) async -> Void
    let restTimer: WatchRestTimer?
    let onAdjustRestTimer: (Int) async -> Void
    let onStopRestTimer: () async -> Void
    let onRecordSetTimer: (Int, Int, Bool, Int) async -> Void  // entryIndex, setIndex, keepTiming, seconds
    let onCloseSetTimer: () async -> Void
    let onCheckSetTimer: () async -> Void
    let onAddSet: (Int) async -> Void  // entryIndex
    let onDeleteSet: (Int, Int) async -> Void  // entryIndex, setIndex
    let onBack: () -> Void
    let onAllSetsCompleted: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.navbarHeight) private var navbarHeight
    @Environment(\.screenWidth) private var screenWidth

    private var workout: WatchWorkout? {
        workoutManager.activeWorkout
    }

    @State private var elapsedTime: TimeInterval = 0
    @State private var timer: Timer?
    @State private var currentExerciseIndex: Int = 0
    @State private var currentSetIndices: [Int] = []  // Track current set index per exercise
    @State private var inputValues: [[SetInput]] = []  // Track input values per exercise per set
    @State private var selectedField: SelectedField = .none
    @State private var crownExerciseValue: Double = 0
    @State private var amrapModal: WatchAmrapModal? = nil
    @State private var localRestTimer: WatchRestTimer? = nil
    @State private var restTimerElapsed: Int = 0
    @State private var showRestTimerScreen: Bool = false
    @FocusState private var isExerciseNavigationFocused: Bool

    struct SetInput {
        var reps: Int
        var repsLeft: Int
        var weight: Double
    }

    @State private var currentTime: Date = Date()

    var body: some View {
        Group {
            if let workout = workout {
                mainContent(workout: workout)
            } else {
                ProgressView()
                    .onAppear {
                        dismiss()
                    }
            }
        }
    }

    @ViewBuilder
    private func mainContent(workout: WatchWorkout) -> some View {
        let restTimerButtonHeight: CGFloat = 28  // Approx height of rest timer button
        let restTimerTop = (navbarHeight - restTimerButtonHeight) / 2
        let heartRateTop = navbarHeight * 0.65

        ZStack(alignment: .top) {
            TabView(selection: $currentExerciseIndex) {
                ForEach(Array(workout.exercises.enumerated()), id: \.offset) { exerciseIndex, exercise in
                    ExercisePageView(
                        exercise: exercise,
                        exerciseIndex: exerciseIndex,
                        currentSetIndex: bindingForSetIndex(exerciseIndex),
                        inputValues: bindingForInputValues(exerciseIndex),
                        elapsedTime: elapsedTime,
                        selectedField: $selectedField,
                        isCompletingSet: isCompletingSet,
                        onComplete: { setIndex, reps, weight in
                            await onComplete(exerciseIndex, setIndex, reps, weight)
                            // Refresh rest timer after set completion
                            updateRestTimerElapsed()
                            // Check if AMRAP modal is needed
                            if let modal = await onGetAmrapModal() {
                                amrapModal = modal
                            }
                        },
                        onGetNextEntryAndSetIndex: { setIndex in
                            await onGetNextEntryAndSetIndex(exerciseIndex, setIndex)
                        },
                        onNavigateToExercise: { newExerciseIndex, newSetIndex in
                            currentExerciseIndex = newExerciseIndex
                            if newExerciseIndex < currentSetIndices.count {
                                currentSetIndices[newExerciseIndex] = newSetIndex
                            }
                        },
                        onGetValidWeights: { currentWeight, unit in
                            await onGetValidWeights(exerciseIndex, currentWeight, unit)
                        },
                        onUpdateReps: { setIndex, reps in
                            await onUpdateReps(exerciseIndex, setIndex, reps)
                        },
                        onUpdateRepsLeft: { setIndex, repsLeft in
                            await onUpdateRepsLeft(exerciseIndex, setIndex, repsLeft)
                        },
                        onUpdateWeight: { setIndex, weight in
                            await onUpdateWeight(exerciseIndex, setIndex, weight)
                        },
                        onUpdateCompletedSetTimer: { setIndex, seconds in
                            await onUpdateCompletedSetTimer(exerciseIndex, setIndex, seconds)
                        },
                        onAddSet: {
                            await onAddSet(exerciseIndex)
                        },
                        onDeleteSet: { setIndex in
                            await onDeleteSet(exerciseIndex, setIndex)
                        },
                        onBack: onBack,
                        onAllSetsCompleted: onAllSetsCompleted
                    )
                    .tag(exerciseIndex)
                }
            }
            .tabViewStyle(.verticalPage)

            // Rest timer at top - centered vertically in navbar
            if let timer = localRestTimer {
                Button(action: { showRestTimerScreen = true }) {
                    VStack(spacing: -1) {
                        Text(formatRestTimerElapsed(restTimerElapsed))
                            .font(.system(size: 14, weight: .semibold))
                            .monospacedDigit()
                            .foregroundColor(restTimerElapsed > timer.timer ? .red : LiftosaurColor.textPrimary)
                        Text(formatRestTimerTotal(timer.timer))
                            .font(.system(size: 10))
                            .monospacedDigit()
                            .foregroundColor(LiftosaurColor.textSecondary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(.top, restTimerTop)
            }

            // Heart rate at top right - positioned under the clock
            HeartRateView(heartRate: heartRate, fontSize: 12)
                .padding(.top, heartRateTop)
                .padding(.trailing, screenWidth * 0.06)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .ignoresSafeArea(edges: .top)
        .sheet(item: $amrapModal) { modal in
            AmrapModalView(
                modal: modal,
                isCompletingSet: isCompletingSet,
                onSubmit: { reps, repsLeft, weight, rpe, userVars in
                    Task {
                        await onCompleteSetWithAmrap(reps, repsLeft, weight, rpe, userVars)
                        amrapModal = nil
                        // Refresh rest timer after AMRAP completion
                        updateRestTimerElapsed()
                        // Navigate to next set after AMRAP completion
                        selectedField = .none
                        if let next = await onGetNextEntryAndSetIndex(modal.entryIndex, modal.setIndex) {
                            if next.entryIndex == currentExerciseIndex {
                                // Same exercise, just move to next set
                                if next.entryIndex < currentSetIndices.count {
                                    currentSetIndices[next.entryIndex] = next.setIndex
                                }
                            } else {
                                // Different exercise, navigate there
                                currentExerciseIndex = next.entryIndex
                                if next.entryIndex < currentSetIndices.count {
                                    currentSetIndices[next.entryIndex] = next.setIndex
                                }
                            }
                        } else {
                            onAllSetsCompleted()
                        }
                    }
                },
                onCancel: {
                    amrapModal = nil
                }
            )
        }
        .modifier(ExerciseCrownModifier(
            selectedField: selectedField,
            crownValue: $crownExerciseValue,
            currentExerciseIndex: $currentExerciseIndex,
            maxExercises: workout.exercises.count,
            isNavigationFocused: $isExerciseNavigationFocused
        ))
        .onChange(of: selectedField) { _, newValue in
            if newValue == .none {
                isExerciseNavigationFocused = true
            } else {
                isExerciseNavigationFocused = false
            }
        }
        .sheet(isPresented: $showRestTimerScreen) {
            if let timer = localRestTimer {
                RestTimerScreen(
                    restTimer: timer,
                    heartRate: heartRate,
                    onAdjust: { adjustment in
                        Task {
                            await onAdjustRestTimer(adjustment)
                            updateRestTimerElapsed()
                        }
                    },
                    onDelete: {
                        Task { await onStopRestTimer() }
                    }
                )
            }
        }
        // Bound to the published clock state, so completing a timed set, an `auto` advance, or a clock
        // started on the phone all present this automatically; it dismisses the moment the clock clears.
        // The dismiss chrome (X / swipe) doubles as Discard: the binding's setter only fires on a
        // user-initiated dismiss (not when the model clears the clock itself), so we discard only then.
        .sheet(item: Binding(
            get: { workoutManager.setTimerModal },
            set: { newValue in
                if newValue == nil, workoutManager.setTimerModal != nil {
                    Task { await onCloseSetTimer() }
                }
            }
        )) { _ in
            SetTimerScreen(
                workoutManager: workoutManager,
                heartRate: heartRate,
                onRecord: { seconds in
                    guard let modal = workoutManager.setTimerModal else { return }
                    // The set closes into rest; the cursor advance is handled centrally when setTimerModal
                    // clears (see onChange below). A timed AMRAP set still needs its reps/weight here.
                    await onRecordSetTimer(modal.entryIndex, modal.setIndex, false, seconds)
                    _ = await presentAmrapAfterSetTimer()
                },
                onKeep: { seconds in
                    guard let modal = workoutManager.setTimerModal else { return }
                    // The clock keeps running (set is logged but not closed). A timed AMRAP set still needs its
                    // reps/weight, so present the amrap prompt if it opened; otherwise stay on this screen (the
                    // set-timer sheet re-presents via its binding once amrap resolves).
                    await onRecordSetTimer(modal.entryIndex, modal.setIndex, true, seconds)
                    _ = await presentAmrapAfterSetTimer()
                },
                onCheck: {
                    await runCheckSetTimer()
                }
            )
        }
        .onAppear {
            currentExerciseIndex = initialExerciseIndex
            crownExerciseValue = Double(initialExerciseIndex) * kCrownScale + 1.0
            initializeState(workout: workout)
            localRestTimer = restTimer
            startTimer()
            isExerciseNavigationFocused = true
        }
        .onDisappear {
            stopTimer()
        }
        .onChange(of: restTimer) { _, newValue in
            localRestTimer = newValue
            updateRestTimerElapsed()
        }
        .onChange(of: workoutManager.setTimerModal) { oldValue, newValue in
            // The set timer closed into a rest: it auto-completed at the target, a "Log & keep" set auto-closed,
            // or it was recorded/discarded-after-logging. The model advanced but our local set cursor is still on
            // the finished set, so move it to the next set like a normal completion does. Gated on "a rest is now
            // active" so we don't advance on an AMRAP yield (no rest yet) or a discard that recorded nothing —
            // and on no amrap pending so we never skip past a set that still needs its reps/weight.
            if let finished = oldValue, newValue == nil, workoutManager.restTimer != nil, amrapModal == nil {
                Task { await advanceCursorAfterSetTimer(entryIndex: finished.entryIndex, setIndex: finished.setIndex) }
            }
        }
        .onChange(of: currentExerciseIndex) { _, newValue in
            handleCurrentExerciseIndexChange(newValue)
        }
        .onChange(of: workoutManager.activeWorkout?.currentEntryIndex) { _, newIndex in
            handleRemoteEntryIndexChange(newIndex)
        }
        .onChange(of: workoutManager.activeWorkout) { _, newWorkout in
            handleActiveWorkoutChange(newWorkout)
        }
        .onChange(of: workoutManager.setsCompletedDuringSync) { _, completedSetInfo in
            handleSetsCompletedDuringSync(completedSetInfo)
        }
    }

    // Extracted from `body` to keep the view's modifier chain small enough for the Swift type-checker.
    @MainActor
    private func handleCurrentExerciseIndexChange(_ newValue: Int) {
        selectedField = .none
        crownExerciseValue = Double(newValue) * kCrownScale + 1.0
        // Sync the shown exercise to the phone. The engine no-ops when unchanged, so a move that merely
        // reflects an incoming remote change (handled below) doesn't echo back into a loop.
        Task { await workoutManager.setCurrentEntryIndex(newValue) }
    }

    @MainActor
    private func handleRemoteEntryIndexChange(_ newIndex: Int?) {
        // The shown exercise changed elsewhere — a switch on the phone, or an auto-advance recorded into
        // storage — so follow it. Guarded against the value the watch itself just set so it never fights the
        // local cursor.
        let exerciseCount = workout?.exercises.count ?? 0
        guard let newIndex = newIndex, newIndex != currentExerciseIndex, newIndex < exerciseCount else { return }
        withAnimation { currentExerciseIndex = newIndex }
    }

    @MainActor
    private func handleActiveWorkoutChange(_ newWorkout: WatchWorkout?) {
        guard let newWorkout = newWorkout else { return }
        inputValues = newWorkout.exercises.map { exercise in
            exercise.sets.map { set in
                SetInput(
                    reps: set.completedReps ?? set.reps ?? 0,
                    repsLeft: set.completedRepsLeft ?? set.reps ?? 0,
                    weight: set.completedWeight?.value ?? set.weight?.value ?? 0
                )
            }
        }
        if currentSetIndices.count != newWorkout.exercises.count {
            currentSetIndices = newWorkout.exercises.map { exercise in
                exercise.sets.firstIndex(where: { $0.isCompleted != true }) ?? 0
            }
        } else {
            // Clamp currentSetIndices to valid range (e.g., after deleting a set)
            for i in 0..<currentSetIndices.count {
                let maxIndex = max(0, newWorkout.exercises[i].sets.count - 1)
                if currentSetIndices[i] > maxIndex {
                    currentSetIndices[i] = maxIndex
                }
            }
        }
    }

    @MainActor
    private func handleSetsCompletedDuringSync(_ completedSetInfo: CompletedSetInfo?) {
        guard let completedSetInfo = completedSetInfo else { return }
        workoutManager.setsCompletedDuringSync = nil
        let entryIndex = completedSetInfo.entryIndex
        let setIndex = completedSetInfo.setIndex
        Logger.workout.info(" setsCompletedDuringSync: set completed at entry \(entryIndex), set \(setIndex)")
        Task {
            if let next = await onGetNextEntryAndSetIndex(entryIndex, setIndex) {
                Logger.workout.info(" setsCompletedDuringSync: will navigate to entry \(next.entryIndex), set \(next.setIndex)")
                selectedField = .none
                withAnimation {
                    currentExerciseIndex = next.entryIndex
                    if next.entryIndex < currentSetIndices.count {
                        currentSetIndices[next.entryIndex] = next.setIndex
                    }
                }
                Logger.workout.info(" setsCompletedDuringSync: after update - currentExerciseIndex=\(currentExerciseIndex), setIndices=\(currentSetIndices)")
            } else {
                Logger.workout.info(" setsCompletedDuringSync: getNextEntryAndSetIndex returned nil (all sets complete?)")
                onAllSetsCompleted()
            }
        }
    }

    // MARK: - State Management

    private func initializeState(workout: WatchWorkout) {
        currentSetIndices = workout.exercises.map { exercise in
            // Start at first incomplete set, or 0 if all complete
            exercise.sets.firstIndex(where: { $0.isCompleted != true }) ?? 0
        }

        inputValues = workout.exercises.map { exercise in
            exercise.sets.map { set in
                SetInput(
                    reps: set.completedReps ?? set.reps ?? 0,
                    repsLeft: set.completedRepsLeft ?? set.reps ?? 0,
                    weight: set.completedWeight?.value ?? set.weight?.value ?? 0
                )
            }
        }
    }

    private func bindingForSetIndex(_ exerciseIndex: Int) -> Binding<Int> {
        Binding(
            get: {
                guard exerciseIndex < currentSetIndices.count else { return 0 }
                return currentSetIndices[exerciseIndex]
            },
            set: { newValue in
                guard exerciseIndex < currentSetIndices.count else { return }
                currentSetIndices[exerciseIndex] = newValue
            }
        )
    }

    private func bindingForInputValues(_ exerciseIndex: Int) -> Binding<[SetInput]> {
        Binding(
            get: {
                guard exerciseIndex < inputValues.count else { return [] }
                return inputValues[exerciseIndex]
            },
            set: { newValue in
                guard exerciseIndex < inputValues.count else { return }
                inputValues[exerciseIndex] = newValue
            }
        )
    }

    // A timed AMRAP set still needs its reps/weight after recording (for both "Stop & record" and "Log & keep").
    // getSetTimerModal yields to the amrap modal, so by now the set-timer sheet is dismissing; let it finish
    // before presenting amrap so watchOS doesn't drop the second sheet (see "close modal before navigating").
    @MainActor
    private func presentAmrapAfterSetTimer() async -> Bool {
        guard let amrap = await onGetAmrapModal() else { return false }
        try? await Task.sleep(nanoseconds: 350_000_000)
        amrapModal = amrap
        return true
    }

    // Polls the set timer (auto-advance), then presents the AMRAP prompt if an `auto` set just auto-completed
    // into one: a timed AMRAP set reaching its target opens the amrap modal and keeps the clock behind it (no
    // rest yet), so the set-timer sheet yields without the manual record path that would otherwise present it.
    // Mirrors the in-app behavior. The non-AMRAP close-into-rest cursor advance is handled in onChange.
    @MainActor
    private func runCheckSetTimer() async {
        let hadSetTimer = workoutManager.setTimerModal != nil
        await onCheckSetTimer()
        if hadSetTimer, workoutManager.setTimerModal == nil {
            // Auto-advance only (emom/tabata) — manual Stop/Log goes through onRecord, not this poll — so the
            // user gets an audible cue that the timed set ended while not looking at the watch.
            workoutManager.playSetTimerEndSound()
            if amrapModal == nil {
                _ = await presentAmrapAfterSetTimer()
            }
        }
    }

    // Move the local set cursor to the next set after a set timer closed into rest (mirrors the AMRAP submit
    // navigation). The just-finished set's indices are passed in since the modal is already cleared.
    @MainActor
    private func advanceCursorAfterSetTimer(entryIndex: Int, setIndex: Int) async {
        updateRestTimerElapsed()
        selectedField = .none
        if let next = await onGetNextEntryAndSetIndex(entryIndex, setIndex) {
            currentExerciseIndex = next.entryIndex
            if next.entryIndex < currentSetIndices.count {
                currentSetIndices[next.entryIndex] = next.setIndex
            }
        } else {
            onAllSetsCompleted()
        }
    }

    // MARK: - Timer

    private func startTimer() {
        if let startTime = startTime {
            elapsedTime = Date().timeIntervalSince(startTime)
        }
        currentTime = Date()
        updateRestTimerElapsed()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if let startTime = self.startTime {
                self.elapsedTime = Date().timeIntervalSince(startTime)
            }
            self.currentTime = Date()
            self.updateRestTimerElapsed()
            // While resting, poll so an `auto` rest (Tabata) advances to the next timed set on time. The
            // set-timer screen drives its own poll for the work-timer/EMOM case; the cheap JS predicate
            // makes this a no-op until a threshold is actually crossed.
            if self.localRestTimer != nil {
                Task { await self.runCheckSetTimer() }
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func updateRestTimerElapsed() {
        guard let rt = localRestTimer else {
            restTimerElapsed = 0
            return
        }
        let timerSinceDate = Date(timeIntervalSince1970: rt.timerSince / 1000)
        restTimerElapsed = Int(Date().timeIntervalSince(timerSinceDate))
    }

    private func formatElapsedTime(_ time: TimeInterval) -> String {
        let totalSeconds = Int(max(0, time))
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }

    private func formatRestTimerElapsed(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }

    private func formatRestTimerTotal(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }

    private func formatCurrentTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm"
        return formatter.string(from: date)
    }
}

// MARK: - Exercise Page View (one per exercise, handles horizontal set swiping)

struct ExercisePageView: View {
    let exercise: WatchExercise
    let exerciseIndex: Int
    @Binding var currentSetIndex: Int
    @Binding var inputValues: [ExerciseScreen.SetInput]
    let elapsedTime: TimeInterval
    @Binding var selectedField: SelectedField
    let isCompletingSet: Bool
    let onComplete: (Int, Int, Double) async -> Void  // setIndex, reps, weight
    let onGetNextEntryAndSetIndex: (Int) async -> WatchNextEntryAndSetIndex?  // setIndex -> next entry/set
    let onNavigateToExercise: (Int, Int) -> Void  // exerciseIndex, setIndex
    let onGetValidWeights: (Double, String?) async -> WatchValidWeights?
    let onUpdateReps: (Int, Int) async -> Void  // setIndex, reps
    let onUpdateRepsLeft: (Int, Int) async -> Void  // setIndex, repsLeft
    let onUpdateWeight: (Int, Double) async -> Void  // setIndex, weight
    let onUpdateCompletedSetTimer: (Int, Int) async -> Void  // setIndex, seconds (<0 clears)
    let onAddSet: () async -> Void
    let onDeleteSet: (Int) async -> Void  // setIndex
    let onBack: () -> Void
    let onAllSetsCompleted: () -> Void

    @State private var validWeightsPerSet: [[Double]] = []
    @State private var weightIndicesPerSet: [Int] = []
    @State private var headerHeight: CGFloat = 42
    @State private var navButtonsHeight: CGFloat = 32
    @State private var isAddingSet: Bool = false

    private let addSetTabIndex = 9999

    var body: some View {
        GeometryReader { geometry in
            let contentHeight = max(0, geometry.size.height - headerHeight - navButtonsHeight - 4)
            let contentWidth = geometry.size.width
            VStack(spacing: 0) {
                // Exercise header
                ExerciseHeaderView(
                    exercise: exercise,
                    currentSetIndex: currentSetIndex,
                    isAddSetTab: currentSetIndex == addSetTabIndex,
                    onDeleteSet: onDeleteSet
                )
                .background(
                    GeometryReader { geo in
                        Color.clear
                            .onAppear {
                                headerHeight = geo.size.height
                            }
                            .onChange(of: geo.size.height) { _, newHeight in
                                headerHeight = newHeight
                            }
                    }
                )

                // Horizontal swipeable set content
                TabView(selection: $currentSetIndex) {
                    ForEach(exercise.sets.indices, id: \.self) { setIndex in
                        SetContentView(
                            workoutSet: exercise.sets[setIndex],
                            setIndex: setIndex,
                            inputReps: bindingForReps(setIndex),
                            inputRepsLeft: bindingForRepsLeft(setIndex),
                            inputWeight: bindingForWeight(setIndex),
                            selectedField: $selectedField,
                            validWeights: bindingForValidWeights(setIndex),
                            weightIndex: bindingForWeightIndex(setIndex),
                            contentHeight: contentHeight,
                            contentWidth: contentWidth,
                            onGetValidWeights: onGetValidWeights,
                            onUpdateReps: onUpdateReps,
                            onUpdateRepsLeft: onUpdateRepsLeft,
                            onUpdateWeight: onUpdateWeight,
                            onUpdateCompletedSetTimer: onUpdateCompletedSetTimer
                        )
                        .tag(setIndex)
                        .id("\(exercise.name)-\(setIndex)-\(exercise.sets[setIndex].isUnilateral)")
                    }

                    AddSetTabView(
                        isAddingSet: isAddingSet,
                        contentHeight: contentHeight,
                        onAddSet: { addNewSet() }
                    )
                    .tag(addSetTabIndex)
                    .id("\(exercise.name)-add-set")
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                // Bottom navigation buttons
                SetNavigationButtons(
                    currentSetIndex: currentSetIndex,
                    totalSets: exercise.sets.count,
                    isCompletingSet: isCompletingSet,
                    isAddSetTab: currentSetIndex == addSetTabIndex,
                    isAddingSet: isAddingSet,
                    isSetTimer: currentSetIndex < exercise.sets.count && exercise.sets[currentSetIndex].setTimer != nil,
                    onPrevious: { navigatePrevious() },
                    onComplete: { completeCurrentSet() },
                    onNext: { navigateNext() },
                    onAddSet: { addNewSet() }
                )
                .fixedSize(horizontal: false, vertical: true)
                .background(
                    GeometryReader { geo in
                        Color.clear
                            .onAppear {
                                navButtonsHeight = geo.size.height
                            }
                            .onChange(of: geo.size.height) { _, newHeight in
                                navButtonsHeight = newHeight
                            }
                    }
                )
            }
        }
        .onAppear {
            initializeWeightState()
        }
    }

    private func initializeWeightState() {
        if validWeightsPerSet.isEmpty {
            validWeightsPerSet = exercise.sets.map { _ in [] }
            weightIndicesPerSet = exercise.sets.map { _ in 0 }
        }
    }

    // MARK: - Actions

    private func completeCurrentSet() {
        guard currentSetIndex < exercise.sets.count,
              currentSetIndex < inputValues.count else { return }
        let input = inputValues[currentSetIndex]
        let wasCompleted = exercise.sets[currentSetIndex].isCompleted == true

        Task {
            await onComplete(currentSetIndex, input.reps, input.weight)

            let isNowCompleted = WorkoutManager.shared.activeWorkout?.exercises[exerciseIndex].sets[currentSetIndex].isCompleted == true
            if !wasCompleted && isNowCompleted {
                Logger.engine.info("Getting Next Entry")
                if let next = await onGetNextEntryAndSetIndex(currentSetIndex) {
                    Logger.engine.info("Next Entry: \(next.entryIndex):\(next.setIndex)")
                    selectedField = .none
                    if next.entryIndex == exerciseIndex {
                        currentSetIndex = next.setIndex
                    } else {
                        onNavigateToExercise(next.entryIndex, next.setIndex)
                    }
                } else {
                    onAllSetsCompleted()
                }
            }
        }
    }

    private func navigatePrevious() {
        selectedField = .none
        if currentSetIndex == addSetTabIndex {
            currentSetIndex = exercise.sets.count - 1
        } else if currentSetIndex > 0 {
            currentSetIndex -= 1
        }
    }

    private func navigateNext() {
        selectedField = .none
        if currentSetIndex < exercise.sets.count - 1 {
            currentSetIndex += 1
        } else if currentSetIndex == exercise.sets.count - 1 {
            currentSetIndex = addSetTabIndex
        }
    }

    private func addNewSet() {
        guard !isAddingSet else { return }
        isAddingSet = true
        Task {
            let newSetIndex = exercise.sets.count
            await onAddSet()
            currentSetIndex = newSetIndex
            isAddingSet = false
        }
    }

    private func bindingForReps(_ setIndex: Int) -> Binding<Int> {
        Binding(
            get: {
                guard setIndex < inputValues.count else { return 0 }
                return inputValues[setIndex].reps
            },
            set: { newValue in
                guard setIndex < inputValues.count else { return }
                inputValues[setIndex].reps = newValue
            }
        )
    }

    private func bindingForRepsLeft(_ setIndex: Int) -> Binding<Int> {
        Binding(
            get: {
                guard setIndex < inputValues.count else { return 0 }
                return inputValues[setIndex].repsLeft
            },
            set: { newValue in
                guard setIndex < inputValues.count else { return }
                inputValues[setIndex].repsLeft = newValue
            }
        )
    }

    private func bindingForWeight(_ setIndex: Int) -> Binding<Double> {
        Binding(
            get: {
                guard setIndex < inputValues.count else { return 0 }
                return inputValues[setIndex].weight
            },
            set: { newValue in
                guard setIndex < inputValues.count else { return }
                inputValues[setIndex].weight = newValue
            }
        )
    }

    private func bindingForValidWeights(_ setIndex: Int) -> Binding<[Double]> {
        Binding(
            get: {
                guard setIndex < validWeightsPerSet.count else { return [] }
                return validWeightsPerSet[setIndex]
            },
            set: { newValue in
                guard setIndex < validWeightsPerSet.count else { return }
                validWeightsPerSet[setIndex] = newValue
            }
        )
    }

    private func bindingForWeightIndex(_ setIndex: Int) -> Binding<Int> {
        Binding(
            get: {
                guard setIndex < weightIndicesPerSet.count else { return 0 }
                return weightIndicesPerSet[setIndex]
            },
            set: { newValue in
                guard setIndex < weightIndicesPerSet.count else { return }
                weightIndicesPerSet[setIndex] = newValue
            }
        )
    }
}

// MARK: - Exercise Header

struct ExerciseHeaderView: View {
    let exercise: WatchExercise
    let currentSetIndex: Int
    var isAddSetTab: Bool = false
    var onDeleteSet: ((Int) async -> Void)? = nil
    @State private var showOptionsSheet: Bool = false
    @State private var isDeletingSet: Bool = false

    private let optionsButtonSize: CGFloat = 20

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Text(exercise.name)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LiftosaurColor.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                Spacer()

                if onDeleteSet != nil {
                    Button(action: {
                        WKInterfaceDevice.current().play(.click)
                        showOptionsSheet = true
                    }) {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(LiftosaurColor.textSecondary)
                            .frame(width: optionsButtonSize, height: optionsButtonSize)
                            .background(LiftosaurColor.backgroundSet)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .padding(.trailing, 12)
                }
            }

            if !isAddSetTab {
                HStack(spacing: 4) {
                    Text("Set \(currentSetIndex + 1)/\(exercise.sets.count)")
                        .font(.system(size: 12))
                        .foregroundColor(LiftosaurColor.textSecondary)
                    ScrollingSetIndicator(
                        sets: exercise.sets,
                        currentSetIndex: currentSetIndex
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .sheet(isPresented: $showOptionsSheet) {
            SetOptionsSheet(
                setNumber: currentSetIndex + 1,
                totalSets: exercise.sets.count,
                isDeleting: isDeletingSet,
                onDelete: {
                    guard !isDeletingSet else { return }
                    isDeletingSet = true
                    Task {
                        await onDeleteSet?(currentSetIndex)
                        isDeletingSet = false
                        showOptionsSheet = false
                    }
                },
                onCancel: {
                    showOptionsSheet = false
                }
            )
        }
    }
}

// MARK: - Set Options Sheet

struct SetOptionsSheet: View {
    let setNumber: Int
    let totalSets: Int
    let isDeleting: Bool
    let onDelete: () -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("Set \(setNumber) of \(totalSets)")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LiftosaurColor.textSecondary)

            Button(action: {
                WKInterfaceDevice.current().play(.click)
                onDelete()
            }) {
                if isDeleting {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                } else {
                    HStack(spacing: 6) {
                        Image(systemName: "trash")
                            .font(.system(size: 14))
                        Text("Delete set")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
                }
            }
            .buttonStyle(NavigationButtonStyle(backgroundColor: .red.opacity(0.8), cornerRadius: 10))
            .disabled(isDeleting || totalSets <= 1)
            .opacity(totalSets <= 1 ? 0.5 : 1.0)

            if totalSets <= 1 {
                Text("Cannot delete the last set")
                    .font(.system(size: 11))
                    .foregroundColor(LiftosaurColor.textSecondary)
            }

            Button(action: {
                WKInterfaceDevice.current().play(.click)
                onCancel()
            }) {
                Text("Cancel")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LiftosaurColor.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
            }
            .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.backgroundSet, cornerRadius: 10))
        }
        .padding(.horizontal, 8)
    }
}

// MARK: - Scrolling Set Indicator

struct ScrollingSetIndicator: View {
    let sets: [WatchSet]
    let currentSetIndex: Int

    private let circleSize: CGFloat = 8
    private let spacing: CGFloat = 2
    private let fadeWidth: CGFloat = 12
    private let strokeWidth: CGFloat = 1.5

    var body: some View {
        GeometryReader { geometry in
            let totalContentWidth = CGFloat(sets.count) * circleSize + CGFloat(max(0, sets.count - 1)) * spacing
            let needsScroll = totalContentWidth > geometry.size.width

            ZStack {
                ScrollViewReader { proxy in
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: spacing) {
                            ForEach(sets.indices, id: \.self) { index in
                                Circle()
                                    .fill(sets[index].statusColor)
                                    .frame(width: circleSize, height: circleSize)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white, lineWidth: index == currentSetIndex ? strokeWidth : 0)
                                    )
                                    .id(index)
                            }
                        }
                        .padding(.horizontal, needsScroll ? fadeWidth : 0)
                        .padding(.vertical, strokeWidth)
                    }
                    .scrollDisabled(true)
                    .allowsHitTesting(false)
                    .onChange(of: currentSetIndex) { newIndex in
                        withAnimation(.easeInOut(duration: 0.05)) {
                            proxy.scrollTo(newIndex, anchor: .center)
                        }
                    }
                    .onAppear {
                        proxy.scrollTo(currentSetIndex, anchor: .center)
                    }
                }

                if needsScroll {
                    HStack {
                        LinearGradient(
                            gradient: Gradient(colors: [Color.black, Color.black.opacity(0)]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: fadeWidth)

                        Spacer()

                        LinearGradient(
                            gradient: Gradient(colors: [Color.black.opacity(0), Color.black]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: fadeWidth)
                    }
                    .allowsHitTesting(false)
                }
            }
        }
        .frame(height: circleSize + strokeWidth * 2)
    }
}

// MARK: - Set Content (swipeable area)

struct SetContentView: View {
    let workoutSet: WatchSet
    let setIndex: Int
    @Binding var inputReps: Int
    @Binding var inputRepsLeft: Int
    @Binding var inputWeight: Double
    @Binding var selectedField: SelectedField
    @Binding var validWeights: [Double]
    @Binding var weightIndex: Int
    let contentHeight: CGFloat
    let contentWidth: CGFloat
    let onGetValidWeights: (Double, String?) async -> WatchValidWeights?
    let onUpdateReps: (Int, Int) async -> Void  // setIndex, reps
    let onUpdateRepsLeft: (Int, Int) async -> Void  // setIndex, repsLeft
    let onUpdateWeight: (Int, Double) async -> Void  // setIndex, weight
    let onUpdateCompletedSetTimer: (Int, Int) async -> Void  // setIndex, seconds (<0 clears)

    @State private var showTimeEdit: Bool = false
    @State private var crownRepsValue: Double = 0
    @State private var crownRepsLeftValue: Double = 0
    @State private var crownWeightIndex: Double = 0
    @State private var measuredTargetHeight: CGFloat = 30

    private var initialReps: Int {
        workoutSet.completedReps ?? workoutSet.reps ?? 0
    }

    private var initialRepsLeft: Int {
        workoutSet.completedRepsLeft ?? workoutSet.reps ?? 0
    }

    private var initialWeight: Double {
        workoutSet.completedWeight?.value ?? workoutSet.weight?.value ?? 0
    }

    private var hasWeight: Bool {
        workoutSet.completedWeight != nil || workoutSet.weight != nil
    }

    private let minFieldsHeight: CGFloat = 26
    private let maxFieldsHeight: CGFloat = 40

    var body: some View {
        GeometryReader { geometry in
            // Use contentHeight from parent if valid, otherwise fall back to geometry height
            let actualHeight = contentHeight > 0 ? min(contentHeight, geometry.size.height) : geometry.size.height
            // Use contentWidth from parent (already accounts for padding)
            let actualWidth = contentWidth > 0 ? contentWidth : geometry.size.width
            let minSpacerHeight: CGFloat = 4.0
            let availableHeight = actualHeight - measuredTargetHeight - (minSpacerHeight * 2)

            VStack(spacing: 0) {
                // Container that centers the fields vertically
                VStack(spacing: 0) {
                    Spacer(minLength: minSpacerHeight)
                    inputFieldsView(availableWidth: actualWidth, availableHeight: availableHeight)
                    Spacer(minLength: minSpacerHeight)
                }
                .frame(height: actualHeight - measuredTargetHeight)
                targetInfoView
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .background(
                        GeometryReader { geo in
                            Color.clear
                                .onAppear {
                                    measuredTargetHeight = geo.size.height
                                }
                                .onChange(of: geo.size.height) { _, newHeight in
                                    measuredTargetHeight = newHeight
                                }
                        }
                    )
            }
            .frame(width: geometry.size.width, height: actualHeight)
                    }
        .modifier(FieldCrownModifier(
            selectedField: selectedField,
            crownRepsValue: $crownRepsValue,
            crownRepsLeftValue: $crownRepsLeftValue,
            crownWeightIndex: $crownWeightIndex,
            inputReps: $inputReps,
            inputRepsLeft: $inputRepsLeft,
            inputWeight: $inputWeight,
            validWeights: validWeights,
            weightIndex: $weightIndex,
            setIndex: setIndex,
            onUpdateReps: onUpdateReps,
            onUpdateRepsLeft: onUpdateRepsLeft,
            onUpdateWeight: onUpdateWeight
        ))
        .onAppear {
            loadValidWeights()
        }
        .onChange(of: weightIndex) { _, newIndex in
            checkAndExtendWeights(currentIndex: newIndex)
        }
        .sheet(isPresented: $showTimeEdit) {
            SetTimerEditScreen(
                initialSeconds: workoutSet.completedSetTimer ?? workoutSet.setTimer ?? 0,
                onSave: { seconds in await onUpdateCompletedSetTimer(setIndex, seconds) },
                onClear: { await onUpdateCompletedSetTimer(setIndex, -1) }
            )
        }
    }

    @ViewBuilder
    private func inputFieldsView(availableWidth: CGFloat, availableHeight: CGFloat) -> some View {
        let spacing: CGFloat = workoutSet.isUnilateral ? 4 : 6
        let separatorWidth: CGFloat = workoutSet.isUnilateral ? 12 : 16
        let fontSize: CGFloat = workoutSet.isUnilateral ? 15 : 16
        // Calculate field height: clamp between min and max, but don't exceed available
        let fieldHeight = min(max(minFieldsHeight, availableHeight), maxFieldsHeight)

        // Calculate field widths based on unilateral vs bilateral
        let totalFlex: CGFloat = workoutSet.isUnilateral ? 8 : 2
        let numGaps = workoutSet.isUnilateral ? 3 : 2
        let totalSpacing = spacing * CGFloat(numGaps) + separatorWidth
        let fieldAvailableWidth = availableWidth - totalSpacing - 4  // 4 for horizontal padding
        let unitWidth = fieldAvailableWidth / totalFlex

        let repsLeftWidth = unitWidth * 2
        let repsWidth = workoutSet.isUnilateral ? unitWidth * 2 : unitWidth
        let weightWidth = workoutSet.isUnilateral ? unitWidth * 4 : unitWidth

        // Calculate total content width and starting x
        let totalWidth: CGFloat = workoutSet.isUnilateral
            ? repsLeftWidth + spacing + repsWidth + spacing + separatorWidth + spacing + weightWidth
            : repsWidth + spacing + separatorWidth + spacing + weightWidth
        let startX = (availableWidth - totalWidth) / 2

        // Calculate x positions (center of each element)
        let repsLeftX: CGFloat = workoutSet.isUnilateral ? startX + repsLeftWidth / 2 : -100
        let repsX: CGFloat = workoutSet.isUnilateral
            ? startX + repsLeftWidth + spacing + repsWidth / 2
            : startX + repsWidth / 2
        let separatorX: CGFloat = workoutSet.isUnilateral
            ? startX + repsLeftWidth + spacing + repsWidth + spacing + separatorWidth / 2
            : startX + repsWidth + spacing + separatorWidth / 2
        let weightX: CGFloat = workoutSet.isUnilateral
            ? startX + repsLeftWidth + spacing + repsWidth + spacing + separatorWidth + spacing + weightWidth / 2
            : startX + repsWidth + spacing + separatorWidth + spacing + weightWidth / 2


        ZStack {
            if workoutSet.isUnilateral {
                ScrollableIntField(
                    value: $inputRepsLeft,
                    initialValue: initialRepsLeft,
                    isFocused: selectedField == .repsLeft,
                    minValue: 0,
                    maxValue: 999,
                    step: 1,
                    height: fieldHeight,
                    fontSize: fontSize,
                    hasCompleted: workoutSet.completedRepsLeft != nil,
                    onTap: {
                        if selectedField == .repsLeft {
                            selectedField = .none
                        } else {
                            crownRepsLeftValue = Double(inputRepsLeft) * kCrownScale + 1.0
                            selectedField = .repsLeft
                        }
                    }
                )
                .frame(width: repsLeftWidth, height: fieldHeight)
                .position(x: repsLeftX, y: fieldHeight / 2)
            }

            ScrollableIntField(
                value: $inputReps,
                initialValue: initialReps,
                isFocused: selectedField == .reps,
                minValue: 0,
                maxValue: 999,
                step: 1,
                height: fieldHeight,
                fontSize: fontSize,
                hasCompleted: workoutSet.completedReps != nil,
                suffix: workoutSet.completedReps == nil && !workoutSet.isUnilateral && (workoutSet.isAmrap ?? false) ? "+" : nil,
                minReps: workoutSet.completedReps == nil && !workoutSet.isUnilateral ? workoutSet.minReps : nil,
                onTap: {
                    if selectedField == .reps {
                        selectedField = .none
                    } else {
                        crownRepsValue = Double(inputReps) * kCrownScale + 1.0
                        selectedField = .reps
                    }
                }
            )
            .frame(width: repsWidth, height: fieldHeight)
            .position(x: repsX, y: fieldHeight / 2)

            Text("\u{00D7}")
                .font(.system(size: fontSize))
                .foregroundColor(LiftosaurColor.textSecondary)
                .frame(width: separatorWidth, height: fieldHeight)
                .position(x: separatorX, y: fieldHeight / 2)

            ScrollableWeightField(
                value: $inputWeight,
                weightIndex: $weightIndex,
                initialValue: initialWeight,
                unit: workoutSet.completedWeight?.unit ?? workoutSet.weight?.unit ?? "lb",
                isFocused: selectedField == .weight,
                validWeights: validWeights,
                height: fieldHeight,
                fontSize: fontSize,
                completedRpe: workoutSet.completedRpe,
                hasCompleted: workoutSet.completedWeight != nil,
                hasWeight: hasWeight,
                suffix: workoutSet.completedWeight == nil && (workoutSet.askWeight ?? false) ? "+" : nil,
                onTap: {
                    if selectedField == .weight {
                        selectedField = .none
                    } else {
                        crownWeightIndex = Double(weightIndex) * kCrownScale + 1.0
                        selectedField = .weight
                    }
                }
            )
            .frame(width: weightWidth, height: fieldHeight)
            .position(x: weightX, y: fieldHeight / 2)
        }
        .frame(width: availableWidth, height: fieldHeight)
    }

    @ViewBuilder
    private var targetInfoView: some View {
        VStack(alignment: .leading, spacing: 1) {
            ColoredTargetInfoView(setInfo: workoutSet, isWarmup: workoutSet.isWarmup, useOriginalWeight: true)
                .font(.system(size: 11))

            HStack(spacing: 0) {
                Text("Plates: ")
                    .foregroundColor(.secondary)
                if let plates = workoutSet.plates, !plates.isEmpty {
                    Text(plates)
                        .foregroundColor(LiftosaurColor.textPrimary)
                        .fontWeight(.bold)
                } else {
                    Text("None")
                        .foregroundColor(LiftosaurColor.textPrimary)
                        .fontWeight(.bold)
                }
                // The recorded set-timer duration rides at the trailing edge of the plates line instead of its
                // own row, so it doesn't squish the reps/weight fields on compact watches. Tap anywhere in this
                // area to edit it.
                if let recorded = workoutSet.completedSetTimer {
                    Spacer(minLength: 6)
                    Text(formatMMSS(recorded))
                        .foregroundColor(LiftosaurColor.purple400)
                        .fontWeight(.bold)
                }
            }
            .font(.system(size: 11))
            .lineLimit(1)
            .minimumScaleFactor(1.0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 2)
        .contentShape(Rectangle())
        .onTapGesture {
            if workoutSet.setTimer != nil || workoutSet.completedSetTimer != nil {
                showTimeEdit = true
            }
        }
    }

    private func formatMMSS(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }

    private func loadValidWeights() {
        Task {
            let unit = workoutSet.weight?.unit
            if let result = await onGetValidWeights(inputWeight, unit) {
                validWeights = result.weights
                weightIndex = result.currentIndex
                crownWeightIndex = Double(result.currentIndex) * kCrownScale + 1.0
            }
        }
    }

    private func checkAndExtendWeights(currentIndex: Int) {
        Task {
            let edgeThreshold = 5
            let unit = workoutSet.weight?.unit

            if currentIndex < edgeThreshold && validWeights.count > 0 {
                let lowestWeight = validWeights.first!
                if let result = await onGetValidWeights(lowestWeight, unit) {
                    let newLowerWeights = result.weights.filter { $0 < lowestWeight }
                    if !newLowerWeights.isEmpty {
                        validWeights = newLowerWeights + validWeights
                        weightIndex = weightIndex + newLowerWeights.count
                        crownWeightIndex = Double(weightIndex) * kCrownScale + 1.0
                    }
                }
            }

            // Near upper edge - extend upward
            if currentIndex > validWeights.count - edgeThreshold - 1 && validWeights.count > 0 {
                let highestWeight = validWeights.last!
                if let result = await onGetValidWeights(highestWeight, unit) {
                    // Find new weights that are higher than our current highest
                    let newUpperWeights = result.weights.filter { $0 > highestWeight }
                    if !newUpperWeights.isEmpty {
                        validWeights = validWeights + newUpperWeights
                    }
                }
            }
        }
    }
}

struct FieldCrownModifier: ViewModifier {
    let selectedField: SelectedField
    @Binding var crownRepsValue: Double
    @Binding var crownRepsLeftValue: Double
    @Binding var crownWeightIndex: Double
    @Binding var inputReps: Int
    @Binding var inputRepsLeft: Int
    @Binding var inputWeight: Double
    let validWeights: [Double]
    @Binding var weightIndex: Int
    let setIndex: Int
    let onUpdateReps: (Int, Int) async -> Void
    let onUpdateRepsLeft: (Int, Int) async -> Void
    let onUpdateWeight: (Int, Double) async -> Void

    @State private var repsDebounceTask: Task<Void, Never>?
    @State private var repsLeftDebounceTask: Task<Void, Never>?
    @State private var weightDebounceTask: Task<Void, Never>?

    func body(content: Content) -> some View {
        content
            .background(
                Group {
                    if selectedField == .reps {
                        Color.clear
                            .focusable()
                            .digitalCrownRotation(
                                $crownRepsValue,
                                from: 0,
                                through: 999 * kCrownScale + (kCrownScale - 1),
                                by: 1,
                                sensitivity: .low,
                                isContinuous: false,
                                isHapticFeedbackEnabled: true
                            )
                            .onChange(of: crownRepsValue) { _, newValue in
                                let newReps = max(0, min(999, Int(newValue.rounded() / kCrownScale)))
                                if newReps != inputReps {
                                    inputReps = newReps
                                    repsDebounceTask?.cancel()
                                    repsDebounceTask = Task {
                                        try? await Task.sleep(nanoseconds: kDebounceNs)
                                        guard !Task.isCancelled else { return }
                                        await onUpdateReps(setIndex, newReps)
                                    }
                                }
                            }
                    } else if selectedField == .repsLeft {
                        Color.clear
                            .focusable()
                            .digitalCrownRotation(
                                $crownRepsLeftValue,
                                from: 0,
                                through: 999 * kCrownScale + (kCrownScale - 1),
                                by: 1,
                                sensitivity: .low,
                                isContinuous: false,
                                isHapticFeedbackEnabled: true
                            )
                            .onChange(of: crownRepsLeftValue) { _, newValue in
                                let newRepsLeft = max(0, min(999, Int(newValue.rounded() / kCrownScale)))
                                if newRepsLeft != inputRepsLeft {
                                    inputRepsLeft = newRepsLeft
                                    repsLeftDebounceTask?.cancel()
                                    repsLeftDebounceTask = Task {
                                        try? await Task.sleep(nanoseconds: kDebounceNs)
                                        guard !Task.isCancelled else { return }
                                        await onUpdateRepsLeft(setIndex, newRepsLeft)
                                    }
                                }
                            }
                    } else if selectedField == .weight {
                        Color.clear
                            .focusable()
                            .digitalCrownRotation(
                                $crownWeightIndex,
                                from: 0,
                                through: Double(max(0, validWeights.count - 1)) * kCrownScale + (kCrownScale - 1),
                                by: 1,
                                sensitivity: .low,
                                isContinuous: false,
                                isHapticFeedbackEnabled: true
                            )
                            .onChange(of: crownWeightIndex) { _, newValue in
                                let newIndex = max(0, min(validWeights.count - 1, Int(newValue.rounded() / kCrownScale)))
                                if newIndex != weightIndex && newIndex < validWeights.count {
                                    weightIndex = newIndex
                                    let newWeight = validWeights[newIndex]
                                    inputWeight = newWeight
                                    weightDebounceTask?.cancel()
                                    weightDebounceTask = Task {
                                        try? await Task.sleep(nanoseconds: kDebounceNs)
                                        guard !Task.isCancelled else { return }
                                        await onUpdateWeight(setIndex, newWeight)
                                    }
                                }
                            }
                    }
                }
            )
    }
}

struct ExerciseCrownModifier: ViewModifier {
    let selectedField: SelectedField
    @Binding var crownValue: Double
    @Binding var currentExerciseIndex: Int
    let maxExercises: Int
    var isNavigationFocused: FocusState<Bool>.Binding

    func body(content: Content) -> some View {
        content
            .background(
                Color.clear
                    .focusable(selectedField == .none)
                    .focused(isNavigationFocused)
                    .digitalCrownRotation(
                        $crownValue,
                        from: 0,
                        through: Double(max(0, maxExercises - 1)) * kCrownScale + (kCrownScale - 1),
                        by: 1,
                        sensitivity: .low,
                        isContinuous: false,
                        isHapticFeedbackEnabled: true
                    )
                    .onChange(of: crownValue) { _, newValue in
                        guard selectedField == .none else { return }
                        let newIndex = max(0, min(maxExercises - 1, Int(newValue.rounded() / kCrownScale)))
                        if newIndex != currentExerciseIndex {
                            currentExerciseIndex = newIndex
                        }
                    }
            )
    }
}

// MARK: - Navigation Buttons

struct SetNavigationButtons: View {
    let currentSetIndex: Int
    let totalSets: Int
    let isCompletingSet: Bool
    var isAddSetTab: Bool = false
    var isAddingSet: Bool = false
    var isSetTimer: Bool = false
    let onPrevious: () -> Void
    let onComplete: () -> Void
    let onNext: () -> Void
    var onAddSet: (() -> Void)? = nil

    private let buttonHeight: CGFloat = 32

    var body: some View {
        HStack(spacing: 6) {
            Button(action: {
                WKInterfaceDevice.current().play(.click)
                onPrevious()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor((currentSetIndex > 0 || isAddSetTab) ? LiftosaurColor.textPrimary : LiftosaurColor.textDisabled)
                    .frame(width: buttonHeight, height: buttonHeight)
            }
            .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.backgroundSet, cornerRadius: buttonHeight / 2))
            .disabled(currentSetIndex <= 0 && !isAddSetTab)

            if isAddSetTab {
                Button(action: {
                    WKInterfaceDevice.current().play(.click)
                    onAddSet?()
                }) {
                    if isAddingSet {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: LiftosaurColor.buttonPrimaryLabel))
                            .frame(maxWidth: .infinity)
                            .frame(height: buttonHeight)
                    } else {
                        HStack(spacing: 4) {
                            Text("Add")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundColor(LiftosaurColor.buttonPrimaryLabel)
                        .frame(maxWidth: .infinity)
                        .frame(height: buttonHeight)
                    }
                }
                .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.buttonPrimaryBackground, cornerRadius: buttonHeight / 2))
                .disabled(isAddingSet)
            } else {
                Button(action: {
                    WKInterfaceDevice.current().play(.click)
                    onComplete()
                }) {
                    if isCompletingSet {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: LiftosaurColor.buttonPrimaryLabel))
                            .frame(maxWidth: .infinity)
                            .frame(height: buttonHeight)
                    } else {
                        // A timed set's first tap starts its clock rather than completing it, so show a play
                        // icon instead of the checkmark (mirrors the Live Activity "Start" label).
                        Image(systemName: isSetTimer ? "play.fill" : "checkmark")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(LiftosaurColor.buttonPrimaryLabel)
                            .frame(maxWidth: .infinity)
                            .frame(height: buttonHeight)
                    }
                }
                .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.buttonPrimaryBackground, cornerRadius: buttonHeight / 2))
                .disabled(isCompletingSet)
            }

            Button(action: {
                WKInterfaceDevice.current().play(.click)
                onNext()
            }) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(isAddSetTab ? LiftosaurColor.textDisabled : LiftosaurColor.textPrimary)
                    .frame(width: buttonHeight, height: buttonHeight)
            }
            .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.backgroundSet, cornerRadius: buttonHeight / 2))
            .disabled(isAddSetTab)
        }
    }
}


// MARK: - Button Style with Press Effect

struct NavigationButtonStyle: ButtonStyle {
    let backgroundColor: Color
    var cornerRadius: CGFloat = 22

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(backgroundColor.opacity(configuration.isPressed ? 0.6 : 1.0))
            .cornerRadius(cornerRadius)
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Add Set Tab View

struct AddSetTabView: View {
    let isAddingSet: Bool
    let contentHeight: CGFloat
    let onAddSet: () -> Void

    var body: some View {
        VStack {
            Spacer()
            if isAddingSet {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: LiftosaurColor.textSecondary))
            } else {
                Button(action: {
                    WKInterfaceDevice.current().play(.click)
                    onAddSet()
                }) {
                    VStack(spacing: 8) {
                        Image(systemName: "plus.circle")
                            .font(.system(size: 36, weight: .light))
                            .foregroundColor(LiftosaurColor.textSecondary)
                        Text("Add a set")
                            .font(.system(size: 13))
                            .foregroundColor(LiftosaurColor.textSecondary)
                    }
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
        .frame(height: contentHeight)
        .contentShape(Rectangle())
    }
}

// MARK: - Preview

#Preview {
    ExerciseScreen(
        initialExerciseIndex: 0,
        startTime: Date().addingTimeInterval(-46 * 60 - 56),
        heartRate: 65.0,
        isCompletingSet: false,
        onComplete: { _, _, _, _ in },
        onGetNextEntryAndSetIndex: { _, _ in nil },
        onGetValidWeights: { _, currentWeight, _ in
            let weights = stride(from: max(0, currentWeight - 50), through: currentWeight + 50, by: 5).map { $0 }
            let currentIndex = weights.firstIndex(of: currentWeight) ?? weights.count / 2
            return WatchValidWeights(weights: weights, currentIndex: currentIndex)
        },
        onUpdateReps: { _, _, _ in },
        onUpdateRepsLeft: { _, _, _ in },
        onUpdateWeight: { _, _, _ in },
        onUpdateCompletedSetTimer: { _, _, _ in },
        onGetAmrapModal: { nil },
        onCompleteSetWithAmrap: { _, _, _, _, _ in },
        restTimer: WatchRestTimer(timerSince: Date().timeIntervalSince1970 * 1000 - 90000, timer: 180),
        onAdjustRestTimer: { _ in },
        onStopRestTimer: {},
        onRecordSetTimer: { _, _, _, _ in },
        onCloseSetTimer: {},
        onCheckSetTimer: {},
        onAddSet: { _ in },
        onDeleteSet: { _, _ in },
        onBack: {},
        onAllSetsCompleted: {}
    )
}
