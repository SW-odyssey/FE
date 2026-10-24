"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Modal } from "../presentation";

type Options = {
  modal: Modal;
  timeReturn: "filters" | null;
  dialog: RefObject<HTMLElement | null>;
  setModal: Dispatch<SetStateAction<Modal>>;
  onDismiss: () => void;
};

/** 시트 닫힘 모션과 포커스를 관리하고 Escape는 최신 복귀 동작을 사용합니다. */
export function useDialogLifecycle({
  modal,
  timeReturn,
  dialog,
  setModal,
  onDismiss,
}: Options) {
  const [closingModal, setClosingModal] = useState(false);
  const latestDismiss = useRef(onDismiss);

  useLayoutEffect(() => {
    latestDismiss.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 새 시트의 닫힘 상태를 외부 modal 변경과 맞춥니다.
    setClosingModal(false);
  }, [modal]);

  useEffect(() => {
    if (!closingModal) return;
    const timer = setTimeout(() => {
      setModal(null);
      setClosingModal(false);
    }, 240);
    return () => clearTimeout(timer);
  }, [closingModal, setModal]);

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const elements = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, summary, [tabindex="0"]',
        ) ?? [],
      );
    elements()[0]?.focus({ preventScroll: true });
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") latestDismiss.current();
      if (e.key === "Tab") {
        const list = elements(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus({ preventScroll: true });
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus({ preventScroll: true });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previous?.focus({ preventScroll: true });
    };
  }, [modal, timeReturn, dialog]);

  const dismissSheet = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setModal(null);
    else setClosingModal(true);
  }, [setModal]);

  return { closingModal, dismissSheet };
}
