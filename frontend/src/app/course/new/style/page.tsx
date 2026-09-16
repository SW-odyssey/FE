import { BottomBar } from "@/components/layout/bottom-bar";
import { WizardHeader } from "@/components/layout/wizard-header";
import { LinkButton } from "@/components/common/link-button";

export default function CourseStylePage() {
  return (
    <>
      <WizardHeader step={2} label="데이트 취향" />
      <main className="flex-1 px-inset py-2">
        <h1 className="text-22 font-bold">어떤 하루가 좋아요?</h1>
        {/* TODO(03): 무드 카드 2x2 선택 그리드 + 분위기 태그 칩 */}
      </main>
      <BottomBar>
        <LinkButton
          variant="outline"
          href="/course/new"
          className="h-control flex-1 text-15"
        >
          이전
        </LinkButton>
        <LinkButton
          href="/course/new/confirm"
          className="h-control flex-[2] text-15"
        >
          다음
        </LinkButton>
      </BottomBar>
    </>
  );
}
