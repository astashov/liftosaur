import { JSX, useContext, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetItem } from "../../components/bottomSheetItem";
import { IconCamera } from "../../components/icons/iconCamera";
import { IconPicture } from "../../components/icons/iconPicture";
import { IconSpinner } from "../../components/icons/iconSpinner";
import {
  SendMessage_toIosAndAndroidWithResult,
  SendMessage_isIos,
  SendMessage_isAndroid,
} from "../../utils/sendMessage";
import { useModalDispatch, useModalData, Modal_setResult, Modal_clear, useModal } from "../ModalStateContext";
import { AppContext } from "../../components/appContext";
import { Service } from "../../api/service";
import { ImageUploader } from "../../utils/imageUploader";
import { Importer } from "../../components/importer";

export function NavModalExerciseImageSource(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("exerciseImageSourceModal");
  const exerciseId = data?.exerciseId ?? "";
  const appContext = useContext(AppContext);
  const service = appContext.service ?? new Service(window.fetch.bind(window));
  const isLoggedIn = !!state.user?.id;
  const [isUploading, setIsUploading] = useState(false);

  const onClose = (): void => {
    Modal_clear(modalDispatch, "exerciseImageSourceModal");
    navigation.goBack();
  };

  const openImageLibrary = useModal("exerciseImageLibraryModal", (result) => {
    Modal_setResult(modalDispatch, "exerciseImageSourceModal", result);
    Modal_clear(modalDispatch, "exerciseImageSourceModal");
    navigation.goBack();
  });

  const uploadFromNative = async (source: "camera" | "photo-library"): Promise<void> => {
    if (!isLoggedIn) {
      alert("You need to be logged in to upload custom exercise images");
      return;
    }
    setIsUploading(true);
    const result = await SendMessage_toIosAndAndroidWithResult<{ data: string }>({
      type: "pickphoto",
      source,
    });
    if (result?.data) {
      const imageUploader = new ImageUploader(service);
      const url = await imageUploader.uploadBase64Image(result.data, exerciseId);
      Modal_setResult(modalDispatch, "exerciseImageSourceModal", { smallImageUrl: url });
    }
    setIsUploading(false);
    Modal_clear(modalDispatch, "exerciseImageSourceModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <div className="p-4">
        <div className="text-xs text-center text-text-secondary">Prefer 2:3 aspect ratio</div>
        <BottomSheetItem
          name="from-image-library"
          className="ls-custom-exercise-image-library"
          title="From Image Library"
          onClick={() => {
            openImageLibrary({});
          }}
        />
        {SendMessage_isIos() || SendMessage_isAndroid() ? (
          <>
            <BottomSheetItem
              title="From Camera"
              name="from-camera"
              icon={isUploading ? <IconSpinner width={18} height={18} /> : <IconCamera size={24} />}
              description="Take a photo"
              onClick={() => uploadFromNative("camera")}
            />
            <BottomSheetItem
              title="From Photo Library"
              name="from-photo-library"
              icon={isUploading ? <IconSpinner width={18} height={18} /> : <IconPicture size={24} />}
              description="Pick photo from your photo library"
              onClick={() => uploadFromNative("photo-library")}
            />
          </>
        ) : (
          <Importer
            onRawFile={async (file) => {
              if (!isLoggedIn) {
                alert("You need to be logged in to upload custom exercise images");
                return;
              }
              setIsUploading(true);
              const imageUploader = new ImageUploader(service);
              const url = await imageUploader.uploadImage(file, exerciseId);
              Modal_setResult(modalDispatch, "exerciseImageSourceModal", { smallImageUrl: url });
              setIsUploading(false);
              Modal_clear(modalDispatch, "exerciseImageSourceModal");
              navigation.goBack();
            }}
          >
            {(onClick) => (
              <BottomSheetItem
                name="upload-image"
                icon={isUploading ? <IconSpinner width={18} height={18} /> : undefined}
                className="ls-custom-exercise-upload-image"
                title="Upload Image"
                onClick={() => {
                  if (!isLoggedIn) {
                    alert("You need to be logged in to upload custom exercise images");
                  } else {
                    onClick();
                  }
                }}
              />
            )}
          </Importer>
        )}
      </div>
    </SheetScreenContainer>
  );
}
