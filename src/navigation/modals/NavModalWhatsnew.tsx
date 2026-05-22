import { JSX, useEffect, useMemo } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { IWhatsNew, WhatsNew_all } from "../../models/whatsnew";
import { WhatsNew_updateStorage } from "../../models/whatsnewUtils";
import { DateUtils_format, DateUtils_fromYYYYMMDDStr } from "../../utils/date";
import { ObjectUtils_keys } from "../../utils/object";
import { Text } from "../../components/primitives/text";
import { SimpleMarkdown } from "../../components/simpleMarkdown";
import { useScrollProgressiveList } from "../../utils/useScrollProgressiveList";

export function NavModalWhatsnew(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      WhatsNew_updateStorage(dispatch);
    });
  }, [navigation, dispatch]);

  const onClose = (): void => {
    navigation.goBack();
  };

  const sortedWhatsnewRecords = useMemo(() => {
    const all = WhatsNew_all();
    const list = ObjectUtils_keys(all).reduce<[string, IWhatsNew][]>((memo, dateStr) => {
      memo.push([dateStr, all[dateStr]]);
      return memo;
    }, []);
    list.sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10));
    return list;
  }, []);

  const { visibleItems, onScroll } = useScrollProgressiveList(sortedWhatsnewRecords, { batchSize: 10 });

  return (
    <ModalScreenContainer onClose={onClose} overflowHidden isFullHeight>
      <FormSheet>
        <View style={{ height: windowHeight * 0.85 }}>
          <View className="items-center justify-center pb-2">
            <Text className="text-xl font-bold text-center">What's new?</Text>
          </View>
          <ScrollView className="flex-1" onScroll={onScroll} scrollEventThrottle={16}>
            {visibleItems.map(([dateStr, whatsNewRecord]) => {
              const date = DateUtils_format(DateUtils_fromYYYYMMDDStr(dateStr, ""), true);
              return (
                <View key={dateStr} className="pb-6">
                  <Text className="text-xs font-bold text-text-secondary">{date}</Text>
                  <Text className="text-sm font-bold">{whatsNewRecord.title}</Text>
                  <SimpleMarkdown value={whatsNewRecord.body} />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
