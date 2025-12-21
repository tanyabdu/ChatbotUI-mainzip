import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, LogIn, UserPlus, KeyRound } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    },
    onError: (err: any) => {
      setError(err.message || "Ошибка при входе");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-purple-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-12 w-12 text-purple-600" />
          </div>
          <CardTitle className="text-2xl font-mystic text-purple-700">
            Вход в аккаунт
          </CardTitle>
          <CardDescription className="text-purple-500">
            Введите email и пароль для входа
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
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-purple-700">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                className="border-purple-200 focus:border-purple-400"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={loginMutation.isPending}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loginMutation.isPending ? "Вход..." : "Войти"}
            </Button>
          </form>
          
          <div className="mt-6 space-y-3 text-center">
            <Link href="/register" className="flex items-center justify-center gap-2 text-purple-600 hover:text-purple-800">
              <UserPlus className="h-4 w-4" />
              Создать аккаунт
            </Link>
            <Link href="/forgot-password" className="flex items-center justify-center gap-2 text-purple-500 hover:text-purple-700 text-sm">
              <KeyRound className="h-4 w-4" />
              Забыли пароль?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
