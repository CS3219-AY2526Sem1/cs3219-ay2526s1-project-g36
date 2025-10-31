"use client";

import Button from "../common/Button";
import { useRouter } from "next/navigation";
import { logout } from "../../../../lib/auth";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      variant="secondary"
      onClick={handleLogout}
      className={className}
    >
      Logout
    </Button>
  );
}
