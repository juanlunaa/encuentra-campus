"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
} from "@/lib/catalogs";
import type { CampusZoneDTO } from "@/types/zone";

export interface ItemFiltersValues {
  query: string;
  category: string;
  zoneId: string;
  status: string;
  tag: string;
  from: string;
  to: string;
}

interface ItemFiltersProps {
  zones: CampusZoneDTO[];
  initialValues: ItemFiltersValues;
}

const EMPTY_FILTERS: ItemFiltersValues = {
  query: "",
  category: "",
  zoneId: "",
  status: "",
  tag: "",
  from: "",
  to: "",
};

export function ItemFilters({ zones, initialValues }: ItemFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [values, setValues] = useState<ItemFiltersValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const hasActiveFilters = Object.values(values).some(
    (value) => value.trim().length > 0,
  );

  function navigateWithFilters(nextValues: ItemFiltersValues) {
    const params = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(nextValues)) {
      const cleaned = rawValue.trim();
      if (cleaned) {
        params.set(key, cleaned);
      }
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateWithFilters(values);
  }

  function handleClear() {
    setValues(EMPTY_FILTERS);
    router.push(pathname);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-md border border-rule bg-bone"
    >
      <div className="grid grid-cols-1 gap-px bg-rule sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)] sm:col-span-2">
          <label
            htmlFor="filter-query"
            className="mb-1 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
          >
            Buscar objeto
          </label>
          <input
            id="filter-query"
            type="search"
            value={values.query}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, query: e.target.value }))
            }
            placeholder="Ej. audífonos, carné, llaves, morral..."
            className="w-full border-0 bg-transparent p-0 text-sm text-ink placeholder:text-faint focus:ring-0 focus:outline-none"
          />
        </div>

        <div className="bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)]">
          <label
            htmlFor="filter-category"
            className="mb-1 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
          >
            Categoría
          </label>
          <select
            id="filter-category"
            value={values.category}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, category: e.target.value }))
            }
            className="w-full cursor-pointer border-0 bg-transparent p-0 text-sm text-ink focus:ring-0 focus:outline-none"
          >
            <option value="">Todas las categorías</option>
            {ITEM_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)]">
          <label
            htmlFor="filter-zone"
            className="mb-1 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
          >
            Zona del campus
          </label>
          <select
            id="filter-zone"
            value={values.zoneId}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, zoneId: e.target.value }))
            }
            className="w-full cursor-pointer border-0 bg-transparent p-0 text-sm text-ink focus:ring-0 focus:outline-none"
          >
            <option value="">Todas las zonas</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)]">
          <label
            htmlFor="filter-status"
            className="mb-1 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
          >
            Estado
          </label>
          <select
            id="filter-status"
            value={values.status}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full cursor-pointer border-0 bg-transparent p-0 text-sm text-ink focus:ring-0 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ITEM_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)]">
          <label
            htmlFor="filter-tag"
            className="mb-1 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
          >
            Etiqueta
          </label>
          <input
            id="filter-tag"
            type="text"
            value={values.tag}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, tag: e.target.value }))
            }
            placeholder="Ej. negro, bluetooth"
            className="w-full border-0 bg-transparent p-0 text-sm text-ink placeholder:text-faint focus:ring-0 focus:outline-none"
          />
        </div>

        <div className="bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)]">
          <label
            htmlFor="filter-from"
            className="mb-1 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
          >
            Hallazgo desde
          </label>
          <input
            id="filter-from"
            type="date"
            value={values.from}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, from: e.target.value }))
            }
            className="w-full cursor-pointer border-0 bg-transparent p-0 text-sm text-ink focus:ring-0 focus:outline-none"
          />
        </div>

        <div className="bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)]">
          <label
            htmlFor="filter-to"
            className="mb-1 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
          >
            Hallazgo hasta
          </label>
          <input
            id="filter-to"
            type="date"
            value={values.to}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, to: e.target.value }))
            }
            className="w-full cursor-pointer border-0 bg-transparent p-0 text-sm text-ink focus:ring-0 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-paper/60 px-3.5 py-2">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-shade"
          >
            Limpiar filtros
          </button>
        )}
        <button
          type="submit"
          className="cursor-pointer rounded-sm bg-cobalt px-4 py-1.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
        >
          Aplicar filtros
        </button>
      </div>
    </form>
  );
}
