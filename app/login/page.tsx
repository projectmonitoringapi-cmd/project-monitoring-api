"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function LoginForm() {
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  /* ==========================================
     🔔 ERROR TOAST
  ========================================== */
  const showErrorToast = (message: string) => {
    toast.error(message, { duration: 4000 });
  };

  /* ==========================================
     🔐 LOGIN HANDLER
  ========================================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      showErrorToast("Please enter username and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      /* ❌ LOGIN FAILED */
      if (!res.ok) {
        showErrorToast(data.error || "Login failed.");
        setPassword(""); // keep username
        return;
      }

      /* ✔ SUCCESS */
      toast.success(`Welcome, ${data.user?.name || "User"}!`);

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      showErrorToast("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ==========================================
     🧩 UI
  ========================================== */
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-xl mx-4 shadow-md border border-gray-200 rounded-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-5 rounded-full bg-blue-600">
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>

          <CardTitle>Welcome User</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="px-10 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                placeholder="username"
                value={username}
                onChange={(e) => setUserName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-500"
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                {isLoading ? "Signing in..." : "Sign In"}
              </div>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}