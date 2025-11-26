import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const AppleLoginButton = () => {
  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: window.location.origin + "/auth", // нэвтрэх дараа redirect
      },
    });
    if (error) console.error("Apple login error:", error.message);
  };

  return (
    <Button onClick={handleAppleLogin} className="w-full mt-2">
      Sign in with Apple
    </Button>
  );
};

export default AppleLoginButton;
