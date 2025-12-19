import VoiceRecorder from "../VoiceRecorder";

export default function VoiceRecorderExample() {
  return (
    <VoiceRecorder
      onTranscript={(text) => console.log("Transcript:", text)}
      onGeneratePost={(transcript) => console.log("Generate post from:", transcript)}
    />
  );
}
