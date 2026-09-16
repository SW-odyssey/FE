import { TabBar } from "@/components/layout/tab-bar";
import { LinkButton } from "@/components/common/link-button";

export default function HomePage() {
  return (
    <>
      <main className="flex-1 px-inset py-4">
        <h1 className="text-20 font-bold">오늘의 데이트</h1>
        {/* TODO(01): 추천 코스 카드 / 지금 가기 좋은 곳 리스트 */}
        <LinkButton
          href="/course/new"
          className="mt-4 h-control w-full text-15"
        >
          나만의 코스 만들기
        </LinkButton>
      </main>
      <TabBar />
    </>
  );
}
