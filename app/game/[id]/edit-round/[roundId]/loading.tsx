import { SkeletonCards, SkeletonPage } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage titleWidth="w-36">
      <SkeletonCards count={3} />
    </SkeletonPage>
  );
}
