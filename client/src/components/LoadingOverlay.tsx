import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
}

export default function LoadingOverlay({ isVisible, text = "Загрузка..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
        <p className="text-xl font-mystic text-purple-200 animate-pulse">{text}</p>
      </div>
    </div>
  );
}
