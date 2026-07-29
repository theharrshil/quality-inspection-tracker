import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useRouter } from "../lib/router";
import { useInspections, type ListFilters } from "../lib/queries";
import { ApiError } from "../lib/api";
import { FilterBar } from "../components/FilterBar";
import { InspectionCard } from "../components/InspectionCard";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui";

const DEFAULT_FILTERS: ListFilters = { sort: "-createdAt" };

export function InspectionsList() {
  const { navigate } = useRouter();
  const { logout } = useAuth();
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);

  const query = useInspections(filters);

  function setFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Inspections"
        right={
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-11 px-2 text-sm font-medium text-slate-500"
          >
            Sign out
          </button>
        }
      />

      <FilterBar
        filters={filters}
        onChange={setFilter}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      {query.isPending ? (
        <LoadingState label="Loading inspections…" />
      ) : query.isError ? (
        <ErrorState
          message={
            query.error instanceof ApiError
              ? query.error.message
              : "Could not load inspections."
          }
          onRetry={() => void query.refetch()}
        />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title="No inspections found"
          hint="Try clearing filters, or log the first defect."
          action={
            <Button onClick={() => navigate("/log")}>+ Log inspection</Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3 p-3">
          <p className="px-1 text-xs font-medium text-slate-400">
            {query.data.meta.total} total
            {query.isFetching ? " · refreshing…" : ""}
          </p>
          {query.data.data.map((inspection) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              onClick={() => navigate(`/inspections/${inspection.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
