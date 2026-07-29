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

export function useCreateInspection() {
  const invalidate = useInvalidateInspections();
  return useMutation({
    mutationFn: (input: CreateInspection) =>
      apiFetch<Inspection>("/inspections", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useResolveInspection(id: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateInspections();
  return useMutation({
    mutationFn: (resolutionNote: string) =>
      apiFetch<Inspection>(`/inspections/${id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ resolutionNote }),
      }),
    onSuccess: (row) => {
      qc.setQueryData(queryKeys.inspection(id), row);
      invalidate();
    },
  });
}
