import ArchetypeQuiz from "../ArchetypeQuiz";

export default function ArchetypeQuizExample() {
  return (
    <ArchetypeQuiz
      onComplete={(profile) => console.log("Quiz complete:", profile)}
      onApply={(profile) => console.log("Archetype applied:", profile)}
    />
  );
}
