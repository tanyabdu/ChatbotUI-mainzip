import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Mail, LogIn, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/password-reset/request", { email });
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: any) => {
      setError(err.message || "Ошибка при отправке запроса");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    resetMutation.mutate();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-green-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-mystic text-green-700">
              Проверьте почту
            </CardTitle>
            <CardDescription className="text-green-600">
              Ссылка для сброса пароля отправлена
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Если аккаунт существует, мы отправили письмо на <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Ссылка действительна в течение 1 часа
            </p>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                <LogIn className="h-4 w-4 mr-2" />
                Вернуться ко входу
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-purple-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-12 w-12 text-purple-600" />
          </div>
          <CardTitle className="text-2xl font-mystic text-purple-700">
            Забыли пароль?
          </CardTitle>
          <CardDescription className="text-purple-500">
            Введите email для получения ссылки на сброс пароля
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="border-purple-200 focus:border-purple-400"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={resetMutation.isPending}
            >
              <Mail className="h-4 w-4 mr-2" />
              {resetMutation.isPending ? "Отправка..." : "Отправить ссылку"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link href="/login" className="flex items-center justify-center gap-2 text-purple-600 hover:text-purple-800">
              <LogIn className="h-4 w-4" />
              Вернуться ко входу
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
