import type { DiscoveryLoadStatus } from "../data/types";
import type { DiscoveryController } from "../hooks/useDiscoveryController";

type Props = Pick<DiscoveryController, "t"> & {
  status: DiscoveryLoadStatus;
  retry: () => void;
  missing?: boolean;
};

/** 비동기 공급부의 대기, 실패와 상세 누락을 구분합니다. */
export function ResourceNotice({ status, retry, t, missing = false }: Props) {
  if (status === "loading")
    return (
      <div className="local-empty" role="status">
        <p>{t("Loading places…", "장소를 불러오는 중…")}</p>
      </div>
    );
  if (status === "error")
    return (
      <div className="local-empty" role="alert">
        <h2>{t("Could not load places", "장소를 불러오지 못했어요")}</h2>
        <button className="local-secondary" onClick={retry}>
          {t("Try again", "다시 시도")}
        </button>
      </div>
    );
  if (missing)
    return (
      <div className="local-empty" role="status">
        <h2>{t("Place unavailable", "장소 정보를 찾을 수 없어요")}</h2>
      </div>
    );
  return null;
}
