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
  const returnFocus = useRef<HTMLElement | null>(null);

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
    if (!modal) {
      if (returnFocus.current?.isConnected) {
        returnFocus.current.focus({ preventScroll: true });
      }
      returnFocus.current = null;
      return;
    }

    const surface = dialog.current;
    if (!surface) return;

    const active = document.activeElement;
    if (!returnFocus.current && active instanceof HTMLElement) {
      returnFocus.current = active;
    }

    const elements = () =>
      Array.from(
        surface.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, summary, [tabindex="0"]',
        ),
      ).filter(
        (element) => element.tabIndex >= 0 && !element.matches(":disabled"),
      );
    (elements()[0] ?? surface).focus({ preventScroll: true });

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        latestDismiss.current();
      }
      if (e.key !== "Tab") return;

      const list = elements();
      const focused = document.activeElement as HTMLElement | null;
      const edge = e.shiftKey ? list[0] : list.at(-1);
      if (!focused || !list.includes(focused) || focused === edge) {
        e.preventDefault();
        const next = e.shiftKey ? list.at(-1) : list[0];
        (next ?? surface).focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [modal, timeReturn, dialog]);

  const dismissSheet = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setModal(null);
    else setClosingModal(true);
  }, [setModal]);

  return { closingModal, dismissSheet };
}
