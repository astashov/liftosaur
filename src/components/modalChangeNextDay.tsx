import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from "react-native";
import { Text } from "./primitives/text";

import { IProgram, ISettings, IStats } from "../types";
import { NextDayPickerDay } from "./nextDayPicker";
import { LinkButton } from "./linkButton";
import { emptyProgramId, Program_evaluate, Program_getListOfDays } from "../models/program";
import { CollectionUtils_findBy } from "../utils/collection";
import { MenuItemEditable } from "./menuItemEditable";
import { useProgressiveCount, useProgressiveItems } from "../utils/useProgressiveItems";
import { INavScreenScrollListener, NavScreenScrollContext } from "../navigation/NavScreenScrollContext";

interface IModalChangeNextDayProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  settings: ISettings;
  stats: IStats;
  onSelect: (programId: string, day: number) => void;
  onClose: () => void;
}

type IDayEntry = [string, string];

export function ModalChangeNextDayContent(props: IModalChangeNextDayProps): JSX.Element {
  const { allPrograms, settings, stats, onSelect, onClose } = props;
  const [currentProgramId, setCurrentProgramId] = useState(props.initialCurrentProgramId);

  const currentProgram = useMemo(
    () =>
      (currentProgramId ? CollectionUtils_findBy(allPrograms, "id", currentProgramId) : undefined) ?? allPrograms[0],
    [currentProgramId, allPrograms]
  );

  const programsValues = useMemo<[string, string][]>(() => allPrograms.map((p) => [p.id, p.name]), [allPrograms]);

  const evaluatedProgram = useMemo(
    () => (currentProgram ? Program_evaluate(currentProgram, settings) : undefined),
    [currentProgram, settings]
  );

  const days = useMemo<IDayEntry[]>(
    () => (evaluatedProgram ? Program_getListOfDays(evaluatedProgram) : []),
    [evaluatedProgram]
  );

  const visibleDays = useProgressiveItems(days, { initialBatch: 12, batchSize: 8 });
  const visibleMuscleCount = useProgressiveCount(visibleDays.length, { initialBatch: 4, batchSize: 4 });

  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollListenersRef = useRef<Set<INavScreenScrollListener>>(new Set());
  const addScrollListener = useCallback((listener: INavScreenScrollListener) => {
    scrollListenersRef.current.add(listener);
    return () => {
      scrollListenersRef.current.delete(listener);
    };
  }, []);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    scrollListenersRef.current.forEach((l) => l(e));
  }, []);
  const scrollCtx = useMemo(() => ({ scrollRef, scrollYRef, addScrollListener }), [addScrollListener]);

  useEffect(() => {
    scrollYRef.current = 0;
  }, [currentProgramId]);

  const handleSelect = useCallback(
    (programId: string, day: number) => {
      onSelect(programId, day);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleEmptyProgram = useCallback(() => {
    onSelect(emptyProgramId, 1);
    onClose();
  }, [onSelect, onClose]);

  const handleProgramChange = useCallback((value?: string) => {
    if (value) {
      setCurrentProgramId(value);
    }
  }, []);

  const highlightedDay = currentProgram?.nextDay;

  const header = (
    <View>
      <Text className="mb-1 text-lg font-semibold text-center">Change Next Workout</Text>
      <View className="items-center">
        <LinkButton name="change-next-day-empty-program" className="mb-2 text-xs" onPress={handleEmptyProgram}>
          Go without a program
        </LinkButton>
      </View>
      {allPrograms.length > 1 && (
        <View className="mx-0">
          <MenuItemEditable
            type="select"
            name="Program"
            value={currentProgram?.id ?? ""}
            values={programsValues}
            onChange={handleProgramChange}
          />
        </View>
      )}
    </View>
  );

  if (!currentProgram || !evaluatedProgram) {
    return (
      <View className="flex-1">
        {header}
        <View className="mx-4">
          <Text>No Programs</Text>
        </View>
      </View>
    );
  }

  return (
    <NavScreenScrollContext.Provider value={scrollCtx}>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {header}
        {visibleDays.map(([dayId, dayName], index) => (
          <NextDayPickerDay
            key={dayId}
            evaluatedProgram={evaluatedProgram}
            dayId={dayId}
            dayName={dayName}
            dayIndex={index}
            highlightedDay={highlightedDay}
            stats={stats}
            settings={settings}
            renderMuscles={index < visibleMuscleCount}
            onSelect={handleSelect}
          />
        ))}
      </ScrollView>
    </NavScreenScrollContext.Provider>
  );
}
