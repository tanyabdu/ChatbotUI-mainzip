import LoadingOverlay from "../LoadingOverlay";

export default function LoadingOverlayExample() {
  return (
    <div className="relative h-64 bg-card rounded-lg">
      <p className="p-4">Content behind overlay</p>
      <LoadingOverlay isVisible={true} text="Генерирую контент..." />
    </div>
  );
}
