import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import TeacherDashboard from "./pages/TeacherDashboard";
import Challenges from "./pages/Challenges";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (cancelled) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // ✅ Get role safely from metadata or app_metadata
      const role =
        currentUser?.user_metadata?.role ||
        currentUser?.app_metadata?.role ||
        null;

      setUserRole(role);
      setLoading(false);
    }

    loadSession();

    // ✅ Listen for login/logout state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      const role =
        currentUser?.user_metadata?.role ||
        currentUser?.app_metadata?.role ||
        null;

      setUserRole(role);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // 🕓 Show loading UI while fetching user data
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-2xl">Түр хүлээнэ үү...</div>
      </div>
    );
  }

  console.log("Current user:", user);
  // console.log("User role:", userRole);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth page */}
            <Route
              path="/auth"
              element={!user ? <Auth /> : <Navigate to="/" replace />}
            />

            {/* Home route */}
            <Route
              path="/"
              element={
                user ? (
                  userRole === "teacher" ? (
                    <Navigate to="/teacher" replace />
                  ) : (
                    <Index />
                  )
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />

            {/* Teacher dashboard */}
            <Route
              path="/teacher"
              element={
                user && userRole === "teacher" ? (
                  <TeacherDashboard />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />

            {/* Challenges page */}
            <Route
              path="/challenges"
              element={user ? <Challenges /> : <Navigate to="/auth" replace />}
            />

            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
