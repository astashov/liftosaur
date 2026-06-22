export interface IPromptRequest {
  message: string;
  callback: (value?: string) => void;
}

type IListener = (request: IPromptRequest | null) => void;
let currentListener: IListener | null = null;

export function Prompt_subscribe(listener: IListener): () => void {
  currentListener = listener;
  return () => {
    if (currentListener === listener) {
      currentListener = null;
    }
  };
}

export function Prompt_show(message: string, callback: (value?: string) => void): void {
  if (currentListener) {
    currentListener({ message, callback });
  } else {
    callback(undefined);
  }
}
