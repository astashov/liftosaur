import { JSX, useContext, useState } from "react";
import { Platform, View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { BottomSheetItem } from "../../components/bottomSheetItem";
import { IconCamera } from "../../components/icons/iconCamera";
import { IconPicture } from "../../components/icons/iconPicture";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { useModalDispatch, useModalData, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { AppContext } from "../../components/appContext";
import { Service } from "../../api/service";
import { ImageUploader } from "../../utils/imageUploader";
import { VideoPicker_pick } from "../../utils/videoPicker";
import { IVideoPick } from "../../utils/videoPick";
import { Importer } from "../../components/importer";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { Dialog_alert } from "../../utils/dialog";

export function NavModalExerciseVideoSource(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("exerciseVideoSourceModal");
  const exerciseId = data?.exerciseId ?? "";
  const appContext = useContext(AppContext);
  const service = appContext.service ?? new Service(fetch);
  const isLoggedIn = !!state.user?.id;
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (pick: IVideoPick): Promise<void> => {
    setIsUploading(true);
    try {
      const url = await new ImageUploader(service).uploadVideo(pick, exerciseId);
      Modal_setResult(modalDispatch, "exerciseVideoSourceModal", { videoUrl: url });
    } catch (e) {
      console.error("Error uploading video", e);
      Dialog_alert("Failed to upload video. Please try again.");
    } finally {
      setIsUploading(false);
      Modal_clear(modalDispatch, "exerciseVideoSourceModal");
      navigation.goBack();
    }
  };

  const uploadFromPicker = async (source: "camera" | "photo-library"): Promise<void> => {
    if (!isLoggedIn) {
      Dialog_alert("You need to be logged in to upload custom exercise videos");
      return;
    }
    const pick = await VideoPicker_pick(source);
    if (pick) {
      await upload(pick);
    }
  };

  const onCloseSheet = (): void => {
    Modal_clear(modalDispatch, "exerciseVideoSourceModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  const content = (
    <View className="bg-background-default">
      <View className="p-4">
        <Text className="text-xs text-center text-text-secondary">MP4, up to 100 MB</Text>
        {Platform.OS !== "web" ? (
          <>
            <BottomSheetItem
              name="record-video"
              title="Record Video"
              icon={isUploading ? <IconSpinner width={18} height={18} /> : <IconCamera size={24} />}
              onClick={() => uploadFromPicker("camera")}
            />
            <BottomSheetItem
              name="video-library"
              title="From Video Library"
              icon={isUploading ? <IconSpinner width={18} height={18} /> : <IconPicture size={24} />}
              onClick={() => uploadFromPicker("photo-library")}
            />
          </>
        ) : (
          <Importer
            accept="video/mp4,video/quicktime,video/*"
            onRawFile={(file) => {
              if (!isLoggedIn) {
                Dialog_alert("You need to be logged in to upload custom exercise videos");
                return;
              }
              upload({ uri: URL.createObjectURL(file), type: file.type || undefined, size: file.size });
            }}
          >
            {(onClick) => (
              <BottomSheetItem
                name="upload-video"
                icon={isUploading ? <IconSpinner width={18} height={18} /> : undefined}
                title="Upload Video"
                onClick={onClick}
              />
            )}
          </Importer>
        )}
      </View>
    </View>
  );

  return (
    <SheetScreenContainer onClose={onCloseSheet} shouldShowClose={true}>
      <FormSheet>{content}</FormSheet>
    </SheetScreenContainer>
  );
}
