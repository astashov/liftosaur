import { JSX, useEffect, useMemo, useState, useCallback } from "react";
import { View, TextInput, FlatList, ListRenderItem, Image } from "react-native";
import { Text } from "../primitives/text";
import { ISettings } from "../../types";
import {
  IExercise,
  Exercise_allExpanded,
  Exercise_find,
  Exercise_fullName,
  Exercise_toKey,
} from "../../models/exercise";
import { MenuItemWrapper } from "../menuItem";
import { ExerciseImage } from "../exerciseImage";
import { Tailwind_colors, Tailwind_semantic } from "../../utils/tailwindConfig";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { StringUtils_fuzzySearch } from "../../utils/string";
import { Service } from "../../api/service";
import { GroupHeader } from "../groupHeader";
import { IconSpinner } from "../icons/iconSpinner";
import { UidFactory_generateUid } from "../../utils/generator";
import { ExerciseImageUtils_url } from "../../models/exerciseImage";
import { BottomSheetOrModal } from "../bottomSheetOrModal";
import { SheetDragHandle } from "../../navigation/SheetScreenContainer";

interface IProps {
  isHidden: boolean;
  settings: ISettings;
  isLoggedIn: boolean;
  service: Service;
  onClose: () => void;
  onSelect: (smallImageUrl?: string, largeImageUrl?: string) => void;
}

export type IExerciseImageLibraryContentProps = Omit<IProps, "isHidden"> & { bare?: boolean };

function getExerciseIdFromImageUrl(url: string): string | undefined {
  return url.split("/").pop()?.split("-").slice(1).join("-").split(".")[0];
}

export function ExerciseImageLibraryContent(props: IExerciseImageLibraryContentProps): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(props.isLoggedIn);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (props.isLoggedIn) {
      props.service.getUploadedImages().then((imgs) => {
        setUploadedImages(imgs);
        setIsLoading(false);
      });
    }
  }, []);

  const trimmedSearch = search.trim().toLowerCase();
  const exercises = useMemo(
    () =>
      !trimmedSearch
        ? Exercise_allExpanded({})
        : Exercise_allExpanded({}).filter((e) => {
            return StringUtils_fuzzySearch(trimmedSearch, e.name.toLowerCase());
          }),
    [trimmedSearch]
  );

  const filteredUploadedImages = !trimmedSearch
    ? uploadedImages
    : uploadedImages.filter((img) => {
        const exerciseId = getExerciseIdFromImageUrl(img);
        const customExercise = exerciseId ? Exercise_find({ id: exerciseId }, props.settings.exercises) : undefined;
        if (customExercise) {
          return StringUtils_fuzzySearch(trimmedSearch, customExercise.name.toLowerCase());
        } else {
          return false;
        }
      });

  const keyExtractor = useCallback((exercise: IExercise) => Exercise_toKey(exercise), []);
  const renderBuiltinItem: ListRenderItem<IExercise> = useCallback(
    ({ item: exercise }) => (
      <MenuItemWrapper
        name={exercise.name}
        onClick={() => {
          const smallImageUrl = ExerciseImageUtils_url(exercise, "small");
          const largeImageUrl = ExerciseImageUtils_url(exercise, "large");
          props.onSelect(smallImageUrl, largeImageUrl);
        }}
      >
        <View className="flex-row items-center h-16 gap-4">
          <View className="w-10">
            <ExerciseImage settings={props.settings} exerciseType={exercise} size="small" className="w-full" />
          </View>
          <Text className="flex-1">{Exercise_fullName(exercise, props.settings)}</Text>
        </View>
      </MenuItemWrapper>
    ),
    [props.onSelect, props.settings]
  );

  const ListHeader = (
    <>
      {(isLoading || filteredUploadedImages.length > 0) && (
        <>
          <GroupHeader name="Uploaded Images" />
          {isLoading ? (
            <View className="items-center py-4">
              <IconSpinner width={18} height={18} />
            </View>
          ) : (
            filteredUploadedImages.map((img) => {
              const exerciseId = getExerciseIdFromImageUrl(img) ?? UidFactory_generateUid(8);
              const customExercise = exerciseId
                ? Exercise_find({ id: exerciseId }, props.settings.exercises)
                : undefined;
              return (
                <MenuItemWrapper
                  key={exerciseId}
                  name={customExercise?.name ?? exerciseId}
                  onClick={() => {
                    props.onSelect(img);
                  }}
                >
                  <View className="flex-row items-center h-16 gap-4">
                    <View className="w-10">
                      <Image source={{ uri: img }} style={{ width: 40, height: 40 }} resizeMode="contain" />
                    </View>
                    {customExercise && (
                      <Text className="flex-1">{Exercise_fullName(customExercise, props.settings)}</Text>
                    )}
                  </View>
                </MenuItemWrapper>
              );
            })
          )}
          <GroupHeader name="Built-in Images" topPadding={true} />
        </>
      )}
    </>
  );

  const header = (
    <SheetDragHandle>
      <View collapsable={false} className="px-4 pb-2">
        <Text className="pt-1 pb-3 text-base font-semibold text-center">Pick Exercise Image</Text>
        <View className="flex-row items-center gap-2 p-2 rounded-lg bg-background-neutral">
          <IconMagnifyingGlass size={18} color={Tailwind_colors().lightgray[600]} />
          <TextInput
            placeholder="Search by name"
            placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
            className="flex-1 text-sm text-text-secondary"
            data-cy="exercise-filter-by-name"
            testID="exercise-filter-by-name"
            defaultValue={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
    </SheetDragHandle>
  );
  const list = (
    <FlatList
      data={exercises}
      keyExtractor={keyExtractor}
      renderItem={renderBuiltinItem}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      initialNumToRender={6}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
    />
  );
  if (props.bare) {
    return (
      <>
        {header}
        {list}
      </>
    );
  }
  return (
    <View className="flex-1">
      {header}
      {list}
    </View>
  );
}

export function BottomSheetExerciseImageLibrary(props: IProps): JSX.Element {
  return (
    <BottomSheetOrModal isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
      <ExerciseImageLibraryContent
        settings={props.settings}
        isLoggedIn={props.isLoggedIn}
        service={props.service}
        onClose={props.onClose}
        onSelect={props.onSelect}
      />
    </BottomSheetOrModal>
  );
}
