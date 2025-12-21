import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, UserPlus, LogIn, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function Register() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/register", { 
        email, 
        firstName: firstName || undefined, 
        lastName: lastName || undefined 
      });
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: any) => {
      setError(err.message || "Ошибка при регистрации");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    registerMutation.mutate();
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
              Регистрация успешна!
            </CardTitle>
            <CardDescription className="text-green-600">
              Проверьте вашу почту для получения пароля
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Мы отправили письмо с паролем на <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Если письмо не пришло, проверьте папку "Спам"
            </p>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                <LogIn className="h-4 w-4 mr-2" />
                Перейти ко входу
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
            Создание аккаунта
          </CardTitle>
          <CardDescription className="text-purple-500">
            Зарегистрируйтесь для получения 3 дней бесплатного доступа
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
              <Label htmlFor="email" className="text-purple-700">Email *</Label>
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-purple-700">Имя</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Анна"
                  className="border-purple-200 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-purple-700">Фамилия</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Иванова"
                  className="border-purple-200 focus:border-purple-400"
                />
              </div>
            </div>
            
            <div className="text-sm text-gray-500 bg-purple-50 p-3 rounded-lg">
              Пароль будет отправлен на указанный email
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={registerMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {registerMutation.isPending ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link href="/login" className="flex items-center justify-center gap-2 text-purple-600 hover:text-purple-800">
              <LogIn className="h-4 w-4" />
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
