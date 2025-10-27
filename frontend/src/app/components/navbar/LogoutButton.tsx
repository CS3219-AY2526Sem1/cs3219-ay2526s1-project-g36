"use client";

import Button from "../common/Button";
import { useRouter } from "next/navigation";
import { mockLogout } from "../../../../lib/mockApi"; 
import { logout } from "../../../../lib/auth";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Button variant="secondary" onClick={handleLogout}>
      Logout
    </Button>
  );
}
