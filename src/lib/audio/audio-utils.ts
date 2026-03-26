export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function playAudioFromBase64(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audio.onended = () => resolve();
    audio.onerror = (e) => reject(e);
    audio.play().catch(reject);
  });
}

export function createAudioElement(base64: string): HTMLAudioElement {
  return new Audio(`data:audio/mpeg;base64,${base64}`);
}

export function createFormDataWithAudio(blob: Blob): FormData {
  const formData = new FormData();
  // Whisper needs a file extension to determine format
  const extension = blob.type.includes("webm") ? "webm" : "mp4";
  formData.append("audio", blob, `recording.${extension}`);
  return formData;
}
