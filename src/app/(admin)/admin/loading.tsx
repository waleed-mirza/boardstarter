import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() { return <div className="grid gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>; }
