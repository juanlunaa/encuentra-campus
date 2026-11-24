import Link from "next/link";
import { ActivityClient } from "@/components/activity/ActivityClient";
import { CLAIM_STATUSES, ITEM_STATUSES } from "@/lib/catalogs";
import { activityService } from "@/services/activity.service";
import { authService } from "@/services/auth.service";
import type { ActivityTab } from "@/types/activity";

export const dynamic = "force-dynamic";

interface ActivityPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseInitialTab(rawTab: string | undefined): ActivityTab {
  return rawTab === "claims" ? "claims" : "items";
}

function parseInitialPage(rawPage: string | undefined): number {
  if (!rawPage) return 1;
  const parsed = Number.parseInt(rawPage, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

function parseInitialBoolean(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-md border border-rule bg-bone p-8 text-center">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">
            Inicia sesión para ver tu actividad
          </h1>
          <p className="mt-2 text-sm text-sepia">
            Debes tener una sesión activa de estudiante para consultar tus
            publicaciones de objetos encontrados y el estado de tus reclamos.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-sm bg-cobalt px-4 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-sm border border-rule-strong bg-bone px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-shade"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const resolvedParams = await searchParams;
  const initialTab = parseInitialTab(getFirstParam(resolvedParams.tab));
  const initialQuery = (getFirstParam(resolvedParams.query) ?? "").trim().slice(0, 120);
  const initialPage = parseInitialPage(getFirstParam(resolvedParams.page));
  const rawStatus = (getFirstParam(resolvedParams.status) ?? "").trim();

  const initialStatus =
    initialTab === "items"
      ? (ITEM_STATUSES as readonly string[]).includes(rawStatus)
        ? rawStatus
        : ""
      : (CLAIM_STATUSES as readonly string[]).includes(rawStatus)
        ? rawStatus
        : "";

  const initialHasPendingClaims =
    initialTab === "items" &&
    parseInitialBoolean(getFirstParam(resolvedParams.hasPendingClaims));

  const initialItemsResponse =
    initialTab === "items"
      ? await activityService.listMyItems(user.id, {
          ...(initialQuery ? { query: initialQuery } : {}),
          ...(initialStatus ? { status: initialStatus } : {}),
          ...(initialHasPendingClaims ? { hasPendingClaims: true } : {}),
          page: initialPage,
          limit: 10,
        })
      : null;

  const initialClaimsResponse =
    initialTab === "claims"
      ? await activityService.listMyClaims(user.id, {
          ...(initialQuery ? { query: initialQuery } : {}),
          ...(initialStatus ? { status: initialStatus } : {}),
          page: initialPage,
          limit: 10,
        })
      : null;

  const initialCounts = initialItemsResponse?.counts ??
    initialClaimsResponse?.counts ?? {
      totalItems: 0,
      totalClaims: 0,
    };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.12em] text-sepia uppercase">
            Seguimiento personal
          </p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Mi actividad
          </h1>
          <p className="mt-1 text-sm text-sepia">
            Consulta el estado de los objetos que has publicado y haz
            seguimiento a tus solicitudes de reclamo.
          </p>
        </div>

        <Link
          href="/items/new"
          className="rounded-sm bg-cobalt px-4 py-2 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
        >
          + Publicar objeto
        </Link>
      </div>

      <ActivityClient
        initialTab={initialTab}
        initialItemsResponse={initialItemsResponse}
        initialClaimsResponse={initialClaimsResponse}
        initialCounts={initialCounts}
        initialQuery={initialQuery}
        initialStatus={initialStatus}
        initialHasPendingClaims={initialHasPendingClaims}
        initialPage={initialPage}
      />
    </main>
  );
}
