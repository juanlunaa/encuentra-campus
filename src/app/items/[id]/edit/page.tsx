import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/ItemForm";
import { ITEM_STATUS_LABELS } from "@/lib/catalogs";
import { NotFoundError } from "@/lib/errors";
import { toCampusZoneDTO, zoneRepository } from "@/repositories/zone.repository";
import { authService } from "@/services/auth.service";
import { foundItemService } from "@/services/found-item.service";
import type { FoundItemDetailDTO } from "@/types/found-item";

interface EditItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id } = await params;
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-md border border-rule bg-bone p-8 text-center">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">
            Inicia sesión para editar
          </h1>
          <p className="mt-2 text-sm text-sepia">
            Debes iniciar sesión como el publicante de este objeto para editar
            su información.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-sm bg-cobalt px-4 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
            >
              Iniciar sesión
            </Link>
            <Link
              href={`/items/${id}`}
              className="rounded-sm border border-rule-strong bg-bone px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-shade"
            >
              Volver al detalle
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let item: FoundItemDetailDTO;
  try {
    item = await foundItemService.getDetail(id, user.id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  if (item.publisherId !== user.id) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-md border border-alert-line bg-bone p-8 text-center">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">Sin permisos</h1>
          <p className="mt-2 text-sm text-sepia">
            Solo el publicante original puede editar esta publicación.
          </p>
          <Link
            href={`/items/${item.id}`}
            className="mt-6 inline-flex rounded-sm border border-rule-strong bg-bone px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-shade"
          >
            Volver al detalle
          </Link>
        </div>
      </main>
    );
  }

  if (item.status === "en_reclamo" || item.status === "devuelto") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-md border border-ochre-line bg-bone p-8 text-center">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">
            Edición bloqueada
          </h1>
          <p className="mt-2 text-sm text-sepia">
            Esta publicación se encuentra en estado{" "}
            <strong>{ITEM_STATUS_LABELS[item.status]}</strong> y no puede ser
            editada.
          </p>
          <Link
            href={`/items/${item.id}`}
            className="mt-6 inline-flex rounded-sm border border-rule-strong bg-bone px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-shade"
          >
            Volver al detalle
          </Link>
        </div>
      </main>
    );
  }

  const zonesDocs = await zoneRepository.findActive();
  const zones = zonesDocs.map(toCampusZoneDTO);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/items/${item.id}`}
          className="font-mono text-xs tracking-[0.08em] text-cobalt uppercase hover:underline"
        >
          ← Volver a la publicación
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Editar publicación
        </h1>
        <p className="mt-1 text-sm text-sepia">
          Actualiza la información, etiquetas o fotografías del objeto
          encontrado.
        </p>
      </div>

      <ItemForm mode="edit" zones={zones} initialItem={item} />
    </main>
  );
}
