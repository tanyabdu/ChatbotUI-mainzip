import { useState } from "react";
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
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-lg border-2 border-purple-200 bg-gradient-to-b from-white to-purple-50 shadow-lg">
            <div className="flex-1 overflow-y-auto p-5 pb-3">
              <div className="text-center mb-3">
                <div className="flex justify-center mb-2">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <h2 className="text-base font-mystic text-purple-700 font-semibold">
                  Обновление условий использования
                </h2>
                <p className="text-xs text-purple-500 mt-1">
                  Для продолжения работы примите соглашения:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="modalConsentData"
                    checked={consentData}
                    onCheckedChange={(checked) => setConsentData(checked === true)}
                    className="mt-0.5 border-purple-300 data-[state=checked]:bg-purple-600 shrink-0"
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

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="modalConsentOffer"
                    checked={consentOffer}
                    onCheckedChange={(checked) => setConsentOffer(checked === true)}
                    className="mt-0.5 border-purple-300 data-[state=checked]:bg-purple-600 shrink-0"
                  />
                  <label htmlFor="modalConsentOffer" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                    Я принимаю условия{" "}
                    <LegalDocumentLink docType="offer">
                      Публичной оферты
                    </LegalDocumentLink>
                    {" "}*
                  </label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="modalConsentMarketing"
                    checked={consentMarketing}
                    onCheckedChange={(checked) => setConsentMarketing(checked === true)}
                    className="mt-0.5 border-purple-300 data-[state=checked]:bg-purple-600 shrink-0"
                  />
                  <label htmlFor="modalConsentMarketing" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                    Я даю{" "}
                    <LegalDocumentLink docType="marketingConsent">
                      согласие на получение рассылок
                    </LegalDocumentLink>
                    {" "}(для получения пароля) *
                  </label>
                </div>

                <p className="text-[10px] text-gray-400">* — обязательные поля</p>
              </div>
            </div>

            <div className="shrink-0 p-4 pt-3 border-t border-purple-100 bg-purple-50 rounded-b-lg">
              <Button
                onClick={handleAccept}
                disabled={!canSubmit || loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {loading ? "Сохраняем..." : "Принять и продолжить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
