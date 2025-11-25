import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, GraduationCap, BookOpen } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [className, setClassName] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        toast({ title: "Амжилттай нэвтэрлээ!" });
        navigate("/");
      } else {

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              // username: displayName,
              role ,
            },
          },
        }
      );
console.log("SignUp Data:", data);
console.log("SignUp Error:", error);
      if (error) throw error;

        if (data.user) {
        const isTeacher = role === "teacher"; // true for teacher, false for student

        // Insert into user_roles table
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: role, // store "teacher" or "student"
        });

        // Upsert into profiles table
        await supabase.from("profiles").upsert({
          id: data.user.id,
          display_name: displayName,
          class_name: role === "student" ? className : null, // only for students
          is_teacher: isTeacher, // true if teacher, false if student
        });
      }


        toast({
          title: "Бүртгэл амжилттай!",
          description: "Та одоо нэвтэрч болно.",
        });

        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Алдаа гарлаа",
        description: error.message || "Таньд нэвтрэхэд алдаа гарлаа.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;

      toast({
        title: "И-мэйл илгээлээ!",
        description: "Нууц үг сэргээх заавар таны и-мэйл хаягт очлоо.",
      });
      setIsForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Алдаа гарлаа",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-glow-primary">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Sparkles className="w-8 h-8 text-primary animate-sparkle" />
          <h1 className="text-3xl font-bold text-primary">TODO</h1>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="resetEmail">И-мэйл хаяг</Label>
              <Input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Түр хүлээнэ үү..." : "Нууц үг сэргээх"}
            </Button>

            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="text-primary hover:underline text-sm w-full text-center"
            >
              Буцах
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="role">Төрөл</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(value: "teacher" | "student") =>
                      setRole(value)
                    }
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <RadioGroupItem value="student" id="student" />
                      <Label htmlFor="student" className="flex items-center gap-2 cursor-pointer">
                        <BookOpen className="w-4 h-4" />
                        Суралцагч
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 flex-1">
                      <RadioGroupItem value="teacher" id="teacher" />
                      <Label htmlFor="teacher" className="flex items-center gap-2 cursor-pointer">
                        <GraduationCap className="w-4 h-4" />
                        Багш
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="displayName">Нэр</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Таны нэр"
                    required
                  />
                </div>

                {role === "student" && (
                  <div>
                    <Label htmlFor="className">Анги</Label>
                    <Input
                      id="className"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="Жишээ: 5-А"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="email">И-мэйл</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Нууц үг</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Түр хүлээнэ үү..." : isLogin ? "Нэвтрэх" : "Бүртгүүлэх"}
            </Button>

            {isLogin && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-primary hover:underline text-sm w-full text-center"
              >
                Нууц үгээ мартсан уу?
              </button>
            )}
          </form>
        )}

        {!isForgotPassword && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline text-sm"
            >
              {isLogin ? "Шинэ хэрэглэгч үү? Бүртгүүлэх" : "Бүртгэлтэй юу? Нэвтрэх"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;
