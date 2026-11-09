"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { spacePreferences } from "../filters";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { placeCount, spaceLabels } from "../localization";
import { SegmentedChoice } from "./SegmentedChoice";
import { SheetHeader } from "./SheetHeader";
type Props = Pick<
  DiscoveryController,
  | "applyFilters"
  | "closeModal"
  | "draftActivity"
  | "draftCount"
  | "draftSpaces"
  | "draftTimeLabel"
  | "language"
  | "openTime"
  | "resetDraftFilters"
  | "setDraftActivity"
  | "toggleDraftSpace"
  | "t"
  | "draftStatus"
  | "retry"
>;
export function FilterSheet(props: Props) {
  const {
    applyFilters,
    closeModal,
    draftActivity,
    draftCount,
    draftSpaces,
    draftTimeLabel,
    language,
    openTime,
    resetDraftFilters,
    setDraftActivity,
    toggleDraftSpace,
    t,
    draftStatus,
    retry,
  } = props;
  return (
    <>
      <div className="local-drag-indicator" />
      {
        <SheetHeader
          title={t("Filters", "필터")}
          t={t}
          closeModal={closeModal}
        />
      }
      <div className="local-filter-options">
        <div className="local-filter-group">
          <SegmentedChoice
            className="local-filter-choice-set is-ambience"
            label={t("Area activity", "인구 밀도")}
            value={draftActivity}
            onChange={setDraftActivity}
            options={[
              { value: "quiet", label: t("Less busy", "한적함") },
              { value: "any", label: t("Any", "상관없음") },
              { value: "lively", label: t("Lively", "활기참") },
            ]}
          />
        </div>
        <div className="local-filter-group is-space">
          <div
            className="local-filter-choice-set is-space"
            role="group"
            aria-label={t("Space", "공간")}
          >
            {spacePreferences.map((id) => (
              <button
                key={id}
                aria-pressed={draftSpaces.includes(id)}
                onClick={() => toggleDraftSpace(id)}
              >
                <span>{t(...spaceLabels[id])}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          className="local-settings-row local-filter-visit-time"
          onClick={() => openTime("filters")}
        >
          <span>{t("Visit time", "방문 시간")}</span>
          <span>
            {draftTimeLabel}
            <LocalIcon name="chevron-right" size={18} />
          </span>
        </button>
      </div>
      <div className="local-sheet-footer local-filter-actions">
        <button className="local-filter-reset" onClick={resetDraftFilters}>
          {t("Reset", "초기화")}
        </button>
        <button
          className="local-primary"
          onClick={draftStatus === "error" ? retry : applyFilters}
          disabled={draftStatus === "loading"}
        >
          {draftStatus === "loading"
            ? t("Loading places…", "장소를 불러오는 중…")
            : draftStatus === "error"
              ? t("Try again", "다시 시도")
              : placeCount(language, draftCount, true)}
        </button>
      </div>
    </>
  );
}
