import { cn } from "@/lib/utils";

/**
 * 화면 하단에 붙는 CTA 영역.
 * fixed 대신 sticky 라서 셸(max-w-[430px]) 폭을 그대로 따라간다.
 */
export function BottomBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 mt-auto flex gap-2 bg-background px-inset pt-3",
        "pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]",
        className
      )}
    >
      {children}
    </div>
  );
}
