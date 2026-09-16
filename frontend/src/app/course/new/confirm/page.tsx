import { BottomBar } from "@/components/layout/bottom-bar";
import { WizardHeader } from "@/components/layout/wizard-header";
import { LinkButton } from "@/components/common/link-button";
import { MOCK_COURSE } from "@/lib/mock";

export default function CourseConfirmPage() {
  return (
    <>
      <WizardHeader step={3} label="조건 확인" />
      <main className="flex-1 px-inset py-2">
        <h1 className="text-22 font-bold">코스 조건</h1>
        {/* TODO(04): 조건 요약 리스트 + 04a 세부 조정 바텀시트 */}
      </main>
      <BottomBar>
        <LinkButton
          variant="outline"
          href="/course/new/style"
          className="h-control flex-1 text-15"
        >
          이전
        </LinkButton>
        <LinkButton
          href={`/course/${MOCK_COURSE.id}`}
          className="h-control flex-[2] text-15"
        >
          코스 만들기
        </LinkButton>
      </BottomBar>
    </>
  );
}
