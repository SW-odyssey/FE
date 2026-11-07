"use client";
import type * as React from "react";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { AreaSheet } from "./AreaSheet";
import { FilterSheet } from "./FilterSheet";
import { LanguageSheet } from "./LanguageSheet";
import { VisitTimeSheet } from "./VisitTimeSheet";
type Props = React.ComponentProps<typeof AreaSheet> &
  React.ComponentProps<typeof FilterSheet> &
  React.ComponentProps<typeof VisitTimeSheet> &
  React.ComponentProps<typeof LanguageSheet> &
  Pick<
    DiscoveryController,
    "closeModal" | "closingModal" | "dialog" | "modal" | "t"
  >;
export function DiscoveryOverlay(props: Props) {
  const { closeModal, closingModal, dialog, modal, t } = props;
  return (
    <div className={`local-modal-layer ${closingModal ? "is-closing" : ""}`}>
      <button
        className="local-scrim"
        aria-label={t("Close dialog", "창 닫기")}
        onClick={closeModal}
      />
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={
          modal === "area"
            ? t("Area", "지역")
            : modal === "filters"
              ? t("Filters", "필터")
              : modal === "time"
                ? t("Visit time", "방문 시간")
                : t("Language", "언어")
        }
        className={
          modal === "menu" ? "local-drawer" : `local-modal-sheet is-${modal}`
        }
      >
        <div key={modal} className="local-modal-body">
          {modal === "area" ? (
            <AreaSheet {...props} />
          ) : modal === "filters" ? (
            <FilterSheet {...props} />
          ) : modal === "time" ? (
            <VisitTimeSheet {...props} />
          ) : (
            <LanguageSheet {...props} />
          )}
        </div>
      </section>
    </div>
  );
}
