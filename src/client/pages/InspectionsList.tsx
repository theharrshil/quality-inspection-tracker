import { useEffect, useState } from "react";
import type { Inspection } from "@validators";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { cacheList, readCachedList } from "../lib/offline";
import { useInspections, type ListFilters } from "../lib/queries";
import { useOffline } from "../lib/useOffline";
import { useRouter } from "../lib/router";
import { FilterBar } from "../components/FilterBar";
import { InspectionCard } from "../components/InspectionCard";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageBody,
  PageHeader,
} from "../components/ui";

const DEFAULT_FILTERS: ListFilters = { sort: "-createdAt" };

export function InspectionsList() {
  const { navigate } = useRouter();
  const { logout } = useAuth();
  const { online, pendingCreates, pendingResolveIds, pendingCount } =
    useOffline();
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [cached, setCached] = useState<Inspection[]>([]);

  const query = useInspections(filters);

  // Cache the latest server list for offline reads.
  useEffect(() => {
    if (query.data) void cacheList(query.data.data);
  }, [query.data]);

  // When offline and the network read failed, fall back to the cached list.
  useEffect(() => {
    if (!online && (query.isError || query.isPending)) {
      void readCachedList().then(setCached);
    }
  }, [online, query.isError, query.isPending]);

  function setFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  const serverItems = query.data?.data ?? (!online ? cached : []);
  const serverIds = new Set(serverItems.map((i) => i.id));
  const pendingCreateIds = new Set(pendingCreates.map((p) => p.id));

  // Prepend optimistic offline creates that aren't yet on the server.
  const merged: Inspection[] = [
    ...pendingCreates.filter((p) => !serverIds.has(p.id)),
    ...serverItems,
  ];

  function toDisplay(item: Inspection): { item: Inspection; pending: boolean } {
    const resolvePending = pendingResolveIds.has(item.id);
    const pending = pendingCreateIds.has(item.id) || resolvePending;
    const shown =
      resolvePending && item.status === "open"
        ? { ...item, status: "resolved" as const }
        : item;
    return { item: shown, pending };
  }

  const showLoading = query.isPending && online && merged.length === 0;
  const showError = query.isError && online && merged.length === 0;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Inspections"
        right={
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-11 px-2 text-sm font-medium text-slate-500 md:hidden"
          >
            Sign out
          </button>
        }
      />

      {!online && (
        <div className="bg-orange-50 px-4 py-2 text-center text-xs font-medium text-orange-700">
          You’re offline — showing cached data.
          {pendingCount > 0 &&
            ` ${pendingCount} change${pendingCount > 1 ? "s" : ""} will sync when you reconnect.`}
        </div>
      )}

      <PageBody max="max-w-6xl" className="flex flex-col gap-4">
        <FilterBar
          filters={filters}
          onChange={setFilter}
          onClear={() => setFilters(DEFAULT_FILTERS)}
        />

        {showLoading ? (
          <LoadingState label="Loading inspections…" />
        ) : showError ? (
          <ErrorState
            message={
              query.error instanceof ApiError
                ? query.error.message
                : "Could not load inspections."
            }
            onRetry={() => void query.refetch()}
          />
        ) : merged.length === 0 ? (
          <EmptyState
            title="No inspections found"
            hint="Try clearing filters, or log the first defect."
            action={
              <Button onClick={() => navigate("/log")}>+ Log inspection</Button>
            }
          />
        ) : (
          <div>
            <p className="px-1 pb-2 text-xs font-medium text-slate-400">
              {query.data
                ? `${query.data.meta.total} total`
                : `${merged.length} shown`}
              {query.isFetching ? " · refreshing…" : ""}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {merged.map((row) => {
                const { item, pending } = toDisplay(row);
                return (
                  <InspectionCard
                    key={item.id}
                    inspection={item}
                    pending={pending}
                    onClick={() => navigate(`/inspections/${item.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </PageBody>
    </div>
  );
}
