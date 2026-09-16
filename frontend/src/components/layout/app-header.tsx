import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  /** 뒤로가기 링크. 없으면 화살표를 숨긴다 */
  backHref?: string;
  /** 오른쪽 영역 (단계 표시 "1 / 3", 텍스트 버튼 등) */
  right?: React.ReactNode;
  className?: string;
}

export function AppHeader({
  title,
  backHref,
  right,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 bg-background px-inset",
        className
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          aria-label="뒤로 가기"
          className="-ml-2 flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-muted"
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : null}
      <span className="truncate text-16 font-semibold">{title}</span>
      <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        {right}
      </div>
    </header>
  );
}
