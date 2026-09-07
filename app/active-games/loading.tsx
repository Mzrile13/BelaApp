import { SkeletonCards, SkeletonPage } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage titleWidth="w-48">
      <SkeletonCards count={4} />
    </SkeletonPage>
  );
}
