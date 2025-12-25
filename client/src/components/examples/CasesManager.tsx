import CasesManager from "../CasesManager";

export default function CasesManagerExample() {
  return (
    <CasesManager
      onSaveCase={(caseData) => console.log("Case saved:", caseData)}
    />
  );
}
