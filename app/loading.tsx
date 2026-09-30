import { SkeletonCards, SkeletonPage } from "@/components/Skeleton";

// Naslovnica i sve rute bez vlastitog loading.tsx. Bez ove granice klik na
// "Početna" u donjoj navigaciji ne bi pokazao ništa dok server ne odgovori.
export default function Loading() {
  return (
    <SkeletonPage titleWidth="w-40">
      <SkeletonCards count={3} />
    </SkeletonPage>
  );
}
