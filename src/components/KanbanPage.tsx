"use client";
import { useFetch, useAuth } from "@/lib/client";
import { Loader } from "@/components/ui";
import KanbanBoard from "@/components/KanbanBoard";
import type { PaginatedOrders } from "@/lib/types";

interface KanbanPageProps {
  type: "office" | "factory";
}

export default function KanbanPage({ type }: KanbanPageProps) {
  const { user } = useAuth();
  const { data: ordersData, loading: lo, refetch: refetchOrders } = useFetch<PaginatedOrders>("/api/orders?status=active&limit=100");
  const { data: stages, loading: ls } = useFetch<any[]>("/api/stages");
  const { data: categories } = useFetch<any[]>("/api/categories");
  const { data: colors } = useFetch<any[]>("/api/colors");

  const orders = ordersData?.orders;

  if (lo || ls || !orders || !stages || !categories || !colors) return <Loader />;

  return (
    <KanbanBoard type={type} stages={stages} orders={orders}
      categories={categories} colors={colors} onRefresh={refetchOrders} userRole={user?.role} />
  );
}
