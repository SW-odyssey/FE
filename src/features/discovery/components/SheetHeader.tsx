import type { ReactNode } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
export function SheetHeader({
  title,
  action,
  back = false,
  t,
  closeModal,
}: Pick<DiscoveryController, "t" | "closeModal"> & {
  title: string;
  action?: ReactNode;
  back?: boolean;
}) {
  return (
    <div className="local-sheet-title">
      {back && (
        <button
          className="local-sheet-back"
          onClick={closeModal}
          aria-label={t("Back to filters", "필터로 돌아가기")}
        >
          <LocalIcon name="chevron-left" size={20} />
        </button>
      )}
      <h2>{title}</h2>
      {action}
      {!back && (
        <button
          className="local-close"
          onClick={closeModal}
          aria-label={t("Close", "닫기")}
        >
          <LocalIcon name="x" size={20} />
        </button>
      )}
    </div>
  );
}
