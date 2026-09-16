import { TabBar } from "@/components/layout/tab-bar";

export default function Page() {
  return (
    <>
      <main className="flex-1 px-inset py-4">
        <h1 className="text-20 font-bold">내 코스</h1>
      </main>
      <TabBar />
    </>
  );
}
