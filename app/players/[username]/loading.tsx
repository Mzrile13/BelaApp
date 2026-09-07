import { SkeletonCards, SkeletonPage, SkeletonRows } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage titleWidth="w-44">
      <SkeletonCards count={1} />
      <div className="mt-4">
        <SkeletonRows count={5} />
      </div>
    </SkeletonPage>
  );
}
