import { JSX, useContext, useState } from "react";
import { View, Platform } from "react-native";
import { Text } from "../../components/primitives/text";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { BottomSheetItem } from "../../components/bottomSheetItem";
import { IconCamera } from "../../components/icons/iconCamera";
import { IconPicture } from "../../components/icons/iconPicture";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { useModalDispatch, useModalData, Modal_setResult, Modal_clear, useModal } from "../ModalStateContext";
import { AppContext } from "../../components/appContext";
import { Service } from "../../api/service";
import { ImageUploader } from "../../utils/imageUploader";
import { ImagePicker_pick } from "../../utils/imagePicker";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { Dialog_alert } from "../../utils/dialog";

export function NavModalExerciseImageSource(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("exerciseImageSourceModal");
  const exerciseId = data?.exerciseId ?? "";
  const appContext = useContext(AppContext);
  const service = appContext.service ?? new Service(fetch);
  const isLoggedIn = !!state.user?.id;
  const [isUploading, setIsUploading] = useState(false);

  const openImageLibrary = useModal("exerciseImageLibraryModal", (result) => {
    Modal_setResult(modalDispatch, "exerciseImageSourceModal", result);
    Modal_clear(modalDispatch, "exerciseImageSourceModal");
    navigation.goBack();
  });

  const upload = async (source: "camera" | "photo-library"): Promise<void> => {
    if (!isLoggedIn) {
      Dialog_alert("You need to be logged in to upload custom exercise images");
      return;
    }
    setIsUploading(true);
    const dataUrl = await ImagePicker_pick(source);
    if (dataUrl) {
      const imageUploader = new ImageUploader(service);
      const url = await imageUploader.uploadBase64Image(dataUrl, exerciseId);
      Modal_setResult(modalDispatch, "exerciseImageSourceModal", { smallImageUrl: url });
    }
    setIsUploading(false);
    Modal_clear(modalDispatch, "exerciseImageSourceModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  const onCloseSheet = (): void => {
    Modal_clear(modalDispatch, "exerciseImageSourceModal");
    navigation.goBack();
  };

  const content = (
    <View className="p-4 bg-background-default">
      <View>
        <Text className="text-xs text-center text-text-secondary">Prefer 2:3 aspect ratio</Text>
        <BottomSheetItem
          name="from-image-library"
          title="From Image Library"
          onClick={() => {
            openImageLibrary({});
          }}
        />
        <BottomSheetItem
          title="From Camera"
          name="from-camera"
          icon={isUploading ? <IconSpinner width={18} height={18} /> : <IconCamera size={24} />}
          description="Take a photo"
          onClick={() => upload("camera")}
        />
        <BottomSheetItem
          title="From Photo Library"
          name="from-photo-library"
          icon={isUploading ? <IconSpinner width={18} height={18} /> : <IconPicture size={24} />}
          description="Pick photo from your photo library"
          onClick={() => upload("photo-library")}
        />
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <SheetScreenContainer onClose={onCloseSheet} shouldShowClose={true}>
        {content}
      </SheetScreenContainer>
    );
  }

  return content;
}
