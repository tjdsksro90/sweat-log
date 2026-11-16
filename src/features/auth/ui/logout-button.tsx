import { Button } from "@/shared/ui/button";

// 로그아웃은 설정 페이지가 넘긴다. 실제 앱은 Server Action, 체험 데모는 데모용 동작을 넘긴다.
export function LogoutButton({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action}>
      <Button className="w-full" type="submit" variant="outline">
        로그아웃
      </Button>
    </form>
  );
}
