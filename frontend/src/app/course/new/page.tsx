import { BottomBar } from "@/components/layout/bottom-bar";
import { WizardHeader } from "@/components/layout/wizard-header";
import { LinkButton } from "@/components/common/link-button";

export default function CourseConditionPage() {
  return (
    <>
      <WizardHeader step={1} label="기본 조건" />
      <main className="flex-1 px-inset py-2">
        <h1 className="text-22 font-bold">언제, 어디서 만날까요?</h1>
        {/* TODO(02): 지역 검색 + 칩 / 달력 / 시간 슬라이더 */}
      </main>
      <BottomBar>
        <LinkButton
          variant="outline"
          href="/"
          className="h-control flex-1 text-15"
        >
          이전
        </LinkButton>
        <LinkButton
          href="/course/new/style"
          className="h-control flex-[2] text-15"
        >
          다음
        </LinkButton>
      </BottomBar>
    </>
  );
}
