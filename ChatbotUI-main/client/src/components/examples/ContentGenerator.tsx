import ContentGenerator from "../ContentGenerator";

export default function ContentGeneratorExample() {
  return (
    <ContentGenerator 
      archetypeActive={true}
      onGenerate={(data) => console.log("Generate content:", data)} 
    />
  );
}
