import Link from "next/link";
import { ItemForm } from "@/components/ItemForm";
import { toCampusZoneDTO, zoneRepository } from "@/repositories/zone.repository";
import { authService } from "@/services/auth.service";

export default async function NewItemPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-md border border-rule bg-bone p-8 text-center">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">
            Inicia sesión para publicar
          </h1>
          <p className="mt-2 text-sm text-sepia">
            Debes tener una sesión activa de estudiante para reportar un objeto
            encontrado en el campus.
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

  const zonesDocs = await zoneRepository.findActive();
  const zones = zonesDocs.map(toCampusZoneDTO);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/"
          className="font-mono text-xs tracking-[0.08em] text-cobalt uppercase hover:underline"
        >
          ← Volver a explorar
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Publicar objeto encontrado
        </h1>
        <p className="mt-1 text-sm text-sepia">
          Registra los datos generales del objeto que encontraste en Sede B —
          Cedesarrollo para ayudar a que vuelva a su dueño.
        </p>
      </div>

      <ItemForm mode="create" zones={zones} />
    </main>
  );
}
