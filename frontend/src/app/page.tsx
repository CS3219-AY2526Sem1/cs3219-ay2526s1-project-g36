// app/page.tsx
"use client";

import { useEffect } from "react";
import { checkLogin, LoggedInUser } from "../../lib/auth";
import { useRouter } from "next/navigation";

export default function Home() {
    // check for existing session on mount
    const router = useRouter();
    useEffect(() => {
      checkLogin().then((user: LoggedInUser | null) => {
        if (user) {
          console.log("Auto-login as:", user.email);
          router.push("/problems");
        }
        else {
          router.push("/login");
        }
      });
    }, [router]);
}
