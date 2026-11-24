"use client";

import type { ReactNode } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";

type Props = Pick<
  DiscoveryController,
  | "currentArea"
  | "setModal"
  | "t"
  | "contextAreaLabel"
  | "openTime"
  | "timeLabel"
> & { children?: ReactNode };

export function DiscoveryContextBar({
  children,
  currentArea,
  setModal,
  t,
  contextAreaLabel,
  openTime,
  timeLabel,
}: Props) {
  return (
    <div className="local-context">
      <button
        className="local-area-select"
        data-location={currentArea ? "current" : "selected"}
        onClick={() => setModal("area")}
        aria-label={`${currentArea ? `${t("Current location", "현위치")}: ` : ""}${contextAreaLabel}. ${t("Choose area", "지역 선택")}`}
      >
        <span>{contextAreaLabel}</span>
        <LocalIcon name="chevron-right" size={16} />
      </button>
      <button
        className="local-time-select"
        onClick={() => openTime()}
        aria-label={t("Choose visit time", "방문 시간 선택")}
      >
        <LocalIcon name="clock" size={16} />
        <span>{timeLabel}</span>
      </button>
      {children}
    </div>
  );
}
