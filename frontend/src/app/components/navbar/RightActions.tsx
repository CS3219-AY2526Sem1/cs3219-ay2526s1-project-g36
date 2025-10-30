"use client";

import { useEffect, useState } from "react";
import { checkLogin } from "../../../../lib/auth";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
import { useRouter } from "next/navigation";
import ProfileButton from "./ProfileButton";

export default function RightActions() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  async function updateLoginStatus() {
    const user = await checkLogin();
    setIsLoggedIn(!!user);
  }

  useEffect(() => {
    updateLoginStatus();
  }, []);

  // Recheck whenever route changes (useful after logout redirect)
  useEffect(() => {
    const handleRouteChange = () => updateLoginStatus();
    router.refresh(); // ensures fresh data on navigation
  }, [router]);

  return (
    <div className="ml-auto flex items-center gap-4">
      {isLoggedIn ? <ProfileButton /> : <LoginButton />}
    </div>
  );
}
