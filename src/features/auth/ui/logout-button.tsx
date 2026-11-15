import { Button } from "@/shared/ui/button";

import { logout } from "../api/auth-actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button className="w-full" type="submit" variant="outline">
        로그아웃
      </Button>
    </form>
  );
}
