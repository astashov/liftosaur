import { JSX, ReactNode, useEffect, useState } from "react";

interface IImage {
  src: string;
  alt: string;
}

export function ImageLightbox(props: { children: ReactNode }): JSX.Element {
  const [image, setImage] = useState<IImage | undefined>(undefined);

  useEffect(() => {
    if (image == null) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setImage(undefined);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("stop-scrolling-modal");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("stop-scrolling-modal");
    };
  }, [image]);

  return (
    <div
      className="image-lightbox"
      onClick={(event) => {
        const target = event.target;
        if (target instanceof HTMLImageElement) {
          setImage({ src: target.currentSrc || target.src, alt: target.alt });
        }
      }}
    >
      {props.children}
      {image != null && (
        <div
          role="dialog"
          aria-label={image.alt}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={(event) => {
            event.stopPropagation();
            setImage(undefined);
          }}
        >
          <div className="absolute inset-0 opacity-95 bg-background-darkgray" />
          <img
            src={image.src}
            alt={image.alt}
            className="relative object-contain max-w-full rounded-2xl"
            style={{ maxHeight: "calc(100vh - 6rem)" }}
          />
          {image.alt && <p className="relative max-w-xl mt-3 text-sm text-center text-text-alwayswhite">{image.alt}</p>}
        </div>
      )}
    </div>
  );
}
