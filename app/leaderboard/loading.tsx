import { SkeletonPage, SkeletonRows } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonRows count={8} />
    </SkeletonPage>
  );
}
