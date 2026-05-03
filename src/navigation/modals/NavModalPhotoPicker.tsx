import { JSX, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetItem } from "../../components/bottomSheetItem";
import { IconCamera } from "../../components/icons/iconCamera";
import { IconPicture } from "../../components/icons/iconPicture";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { ImagePicker_pick } from "../../utils/imagePicker";
import { useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";

export function NavModalPhotoPicker(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const onClose = (): void => {
    Modal_clear(modalDispatch, "photoPickerModal");
    navigation.goBack();
  };

  const pickPhoto = async (source: "camera" | "photo-library"): Promise<void> => {
    setIsLoading(true);
    const data = await ImagePicker_pick(source);
    setIsLoading(false);
    Modal_setResult(modalDispatch, "photoPickerModal", data ?? "");
    Modal_clear(modalDispatch, "photoPickerModal");
    navigation.goBack();
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true} fitContent={true}>
      <View className="p-4">
        <BottomSheetItem
          title="From Camera"
          name="from-camera"
          icon={isLoading ? <IconSpinner width={18} height={18} /> : <IconCamera size={24} />}
          isFirst={true}
          description="Take a photo"
          onClick={() => pickPhoto("camera")}
        />
        <BottomSheetItem
          title="From Photo Library"
          name="from-photo-library"
          icon={isLoading ? <IconSpinner width={18} height={18} /> : <IconPicture size={24} />}
          description="Pick photo from your photo library"
          onClick={() => pickPhoto("photo-library")}
        />
      </View>
    </SheetScreenContainer>
  );
}
