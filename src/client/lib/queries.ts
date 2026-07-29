import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateInspection,
  Inspection,
  ListInspectionsResponse,
  Summary,
} from "@validators";
import { apiFetch } from "./api";
import { submitCreate, submitResolve } from "./offline";

export type ListFilters = Record<string, string>;

export const queryKeys = {
  inspections: (filters: ListFilters) => ["inspections", filters] as const,
  inspection: (id: string) => ["inspection", id] as const,
  summary: () => ["summary"] as const,
};

function toQueryString(filters: ListFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useInspections(filters: ListFilters) {
  return useQuery({
    queryKey: queryKeys.inspections(filters),
    queryFn: () =>
      apiFetch<ListInspectionsResponse>(`/inspections${toQueryString(filters)}`),
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: queryKeys.inspection(id),
    queryFn: () => apiFetch<Inspection>(`/inspections/${id}`),
  });
}

export function useSummary() {
  return useQuery({
    queryKey: queryKeys.summary(),
    queryFn: () => apiFetch<Summary>("/summary"),
  });
}

// Invalidates both the lists and the summary, which are derived from the same data.
function useInvalidateInspections() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["inspections"] });
    void qc.invalidateQueries({ queryKey: ["summary"] });
  };
}

// Create/resolve route through the offline layer: online-first, queued on a
// network failure. Real validation errors (422) still reject the mutation.
export function useCreateInspection() {
  const invalidate = useInvalidateInspections();
  return useMutation({
    mutationFn: (input: CreateInspection) => submitCreate(input),
    onSuccess: invalidate,
  });
}

export function useResolveInspection(id: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateInspections();
  return useMutation({
    mutationFn: (resolutionNote: string) => submitResolve(id, resolutionNote),
    onSuccess: (res) => {
      if (res.inspection) qc.setQueryData(queryKeys.inspection(id), res.inspection);
      invalidate();
    },
  });
}
