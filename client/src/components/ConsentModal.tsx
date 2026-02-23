import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Shield, Loader2 } from "lucide-react";
import { LegalDocumentLink } from "@/components/LegalDocuments";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConsentModalProps {
  open: boolean;
  onAccepted: () => void;
}

export default function ConsentModal({ open, onAccepted }: ConsentModalProps) {
  const [consentData, setConsentData] = useState(false);
  const [consentOffer, setConsentOffer] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const canSubmit = consentData && consentOffer && consentMarketing;

  const handleAccept = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/accept-consents", {
        consentData: true,
        consentOffer: true,
        consentMarketing: true,
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Спасибо!",
          description: "Согласия приняты. Приятного пользования!",
        });
        onAccepted();
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить согласия",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md border-2 border-purple-200 bg-gradient-to-b from-white to-purple-50 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-purple-100 rounded-full">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <DialogTitle className="text-xl font-mystic text-purple-700">
            Обновление условий использования
          </DialogTitle>
          <p className="text-sm text-purple-500 mt-2">
            Мы обновили правовые документы. Для продолжения работы с приложением, пожалуйста, ознакомьтесь и примите следующие соглашения:
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="modalConsentData"
              checked={consentData}
              onCheckedChange={(checked) => setConsentData(checked === true)}
              className="mt-0.5 border-purple-300 data-[state=checked]:bg-purple-600"
            />
            <label htmlFor="modalConsentData" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
              Я даю{" "}
              <LegalDocumentLink docType="dataConsent">
                согласие на обработку персональных данных
              </LegalDocumentLink>
              {" "}и принимаю условия{" "}
              <LegalDocumentLink docType="privacy">
                Политики конфиденциальности
              </LegalDocumentLink>
              {" "}и{" "}
              <LegalDocumentLink docType="terms">
                Пользовательского соглашения
              </LegalDocumentLink>
              {" "}*
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="modalConsentOffer"
              checked={consentOffer}
              onCheckedChange={(checked) => setConsentOffer(checked === true)}
              className="mt-0.5 border-purple-300 data-[state=checked]:bg-purple-600"
            />
            <label htmlFor="modalConsentOffer" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
              Я принимаю условия{" "}
              <LegalDocumentLink docType="offer">
                Публичной оферты
              </LegalDocumentLink>
              {" "}*
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="modalConsentMarketing"
              checked={consentMarketing}
              onCheckedChange={(checked) => setConsentMarketing(checked === true)}
              className="mt-0.5 border-purple-300 data-[state=checked]:bg-purple-600"
            />
            <label htmlFor="modalConsentMarketing" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
              Я даю{" "}
              <LegalDocumentLink docType="marketingConsent">
                согласие на получение рассылок
              </LegalDocumentLink>
              {" "}(необходимо для получения пароля и доступа к приложению) *
            </label>
          </div>

          <p className="text-[10px] text-gray-400">* — обязательные поля</p>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!canSubmit || loading}
          className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {loading ? "Сохраняем..." : "Принять и продолжить"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
