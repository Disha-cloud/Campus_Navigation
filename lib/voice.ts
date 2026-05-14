
/**
 * Simple wrapper for SpeechSynthesis (Voice Output)
 */
export const speak = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
};

/**
 * Interface for Speech Recognition Results
 */
export interface RecognitionResult {
  text: string;
  isFinal: boolean;
}

/**
 * Creates a SpeechRecognition instance if supported.
 */
export const getSpeechRecognition = (
  onResult: (result: RecognitionResult) => void,
  onEnd: () => void
): any => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    const last = event.results.length - 1;
    const text = event.results[last][0].transcript;
    onResult({ text, isFinal: event.results[last].isFinal });
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
};
