"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { languageNames, languages } from "../localization";
import { SheetHeader } from "./SheetHeader";
type Props = Pick<
  DiscoveryController,
  "chooseLanguage" | "closeModal" | "language" | "t"
>;
export function LanguageSheet(props: Props) {
  const { chooseLanguage, closeModal, language, t } = props;
  return (
    <>
      {
        <SheetHeader
          title={t("Language", "언어")}
          t={t}
          closeModal={closeModal}
        />
      }
      <div className="local-drawer-content">
        <div className="local-language-options">
          {languages.map((id) => (
            <button
              key={id}
              aria-pressed={language === id}
              onClick={() => chooseLanguage(id)}
            >
              <span lang={id}>{languageNames[id]}</span>
              {language === id && <LocalIcon name="check" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
