import { AppHeader } from "@/components/layout/app-header";
import { BottomBar } from "@/components/layout/bottom-bar";
import { Button } from "@/components/ui/button";
import { getCourse } from "@/lib/api";
import { formatKoreanDate } from "@/lib/format";

export default async function CoursePage({ params }: PageProps<"/course/[id]">) {
  const { id } = await params;
  const course = await getCourse(id);

  return (
    <>
      <AppHeader title="완성된 코스" backHref="/course/new/confirm" right="지도 보기" />
      <main className="flex-1 px-inset py-2">
        <h1 className="text-22 font-bold">{course.title}</h1>
        <p className="mt-1 text-13 text-muted-foreground">
          {formatKoreanDate(course.date)} · {course.startTime}–{course.endTime} ·{" "}
          {course.steps.length}곳
        </p>
        {/* TODO(05): 타임라인 / 05a 지도 뷰 / 05b 일정 보기 */}
      </main>
      <BottomBar>
        <Button variant="outline" className="h-control flex-1 text-15">
          코스 수정
        </Button>
        <Button className="h-control flex-[2] text-15">이 코스 저장</Button>
      </BottomBar>
    </>
  );
}
