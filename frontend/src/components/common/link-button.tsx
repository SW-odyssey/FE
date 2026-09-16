import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type LinkButtonProps = Omit<
  ComponentProps<typeof Button>,
  "render" | "nativeButton"
> &
  Pick<ComponentProps<typeof Link>, "href">;

/**
 * 링크로 동작하는 버튼.
 *
 * Base UI Button 은 기본적으로 native <button> 을 렌더한다고 가정하므로
 * <a> 를 렌더할 때는 nativeButton={false} 를 넘겨야 한다.
 * 화면마다 반복되는 CTA 라서 빠뜨리지 않게 여기서 한 번만 처리한다.
 */
export function LinkButton({ href, ...props }: LinkButtonProps) {
  return <Button nativeButton={false} render={<Link href={href} />} {...props} />;
}
