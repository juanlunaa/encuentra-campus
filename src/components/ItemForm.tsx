"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ITEM_CATEGORIES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_ITEM_IMAGES,
  OTHER_CATEGORY,
  SAFE_POINTS,
  type CustodyMode,
  type ItemCategory,
} from "@/lib/catalogs";
import type { FoundItemDetailDTO, StoredImage } from "@/types/found-item";
import type { CampusZoneDTO } from "@/types/zone";

interface ItemFormProps {
  mode: "create" | "edit";
  zones: CampusZoneDTO[];
  initialItem?: FoundItemDetailDTO;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ApiErrorShape {
  error?: {
    message?: string;
    details?: Record<string, string[]>;
  };
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ItemForm({ mode, zones, initialItem }: ItemFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultZoneId = initialItem?.zoneId ?? zones[0]?.id ?? "";
  const initialZone = zones.find((z) => z.id === defaultZoneId) ?? zones[0];

  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [description, setDescription] = useState(
    initialItem?.description ?? "",
  );
  const [category, setCategory] = useState<ItemCategory>(
    initialItem?.category ?? ITEM_CATEGORIES[0],
  );
  const [customCategory, setCustomCategory] = useState(
    initialItem?.customCategory ?? "",
  );
  const [zoneId, setZoneId] = useState(defaultZoneId);
  const [floor, setFloor] = useState(
    initialItem?.location.floor ?? initialZone?.floors[0] ?? "",
  );
  const [roomOrDetail, setRoomOrDetail] = useState(
    initialItem?.location.roomOrDetail ?? "",
  );
  const [foundAt, setFoundAt] = useState(
    initialItem ? initialItem.foundAt.slice(0, 10) : getTodayDateString(),
  );

  const [custodyMode, setCustodyMode] = useState<CustodyMode>(
    initialItem?.custody.mode ?? "personal",
  );
  const [verificationQuestion, setVerificationQuestion] = useState(
    initialItem?.custody.verificationQuestion ?? "",
  );
  const [safePointName, setSafePointName] = useState(
    initialItem?.custody.safePointName ?? SAFE_POINTS[0],
  );

  const [tags, setTags] = useState<string[]>(initialItem?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const [existingImages, setExistingImages] = useState<StoredImage[]>(
    initialItem?.images ?? [],
  );
  const [removedImageKeys, setRemovedImageKeys] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingImagesRef = useRef<PendingImage[]>([]);
  pendingImagesRef.current = pendingImages;

  useEffect(() => {
    return () => {
      for (const item of pendingImagesRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === zoneId) ?? null,
    [zones, zoneId],
  );

  const availableFloors = useMemo(() => {
    const base = selectedZone?.floors ?? [];
    if (floor && !base.includes(floor)) {
      return [floor, ...base];
    }
    return base;
  }, [selectedZone, floor]);

  const isLockedToCampusCustody =
    mode === "edit" && initialItem?.status === "en_custodia_campus";

  const totalImagesCount = existingImages.length + pendingImages.length;

  function handleZoneChange(nextZoneId: string) {
    setZoneId(nextZoneId);
    const nextZone = zones.find((z) => z.id === nextZoneId);
    if (nextZone && !nextZone.floors.includes(floor)) {
      setFloor(nextZone.floors[0] ?? "");
    }
  }

  function handleAddTag() {
    const cleaned = tagInput.trim();
    if (!cleaned) return;
    if (cleaned.length > 30) {
      setSubmitError("Cada etiqueta puede tener máximo 30 caracteres.");
      return;
    }
    if (tags.length >= 15) {
      setSubmitError("Puedes agregar máximo 15 etiquetas.");
      return;
    }
    const alreadyExists = tags.some(
      (t) => t.toLowerCase() === cleaned.toLowerCase(),
    );
    if (!alreadyExists) {
      setTags((prev) => [...prev, cleaned]);
    }
    setTagInput("");
    setSubmitError(null);
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleAddTag();
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }

  function handleRemoveExistingImage(key: string) {
    setExistingImages((prev) => prev.filter((img) => img.key !== key));
    setRemovedImageKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setImageError(null);
  }

  function handleRemovePendingImage(id: string) {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
    setImageError(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImageError(null);
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const remainingSlots = MAX_ITEM_IMAGES - totalImagesCount;
    if (selectedFiles.length > remainingSlots) {
      setImageError(
        `Solo puedes tener hasta ${MAX_ITEM_IMAGES} imágenes en total. Actualmente tienes ${totalImagesCount} y puedes agregar máximo ${Math.max(0, remainingSlots)}.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validNewItems: PendingImage[] = [];

    for (const file of selectedFiles) {
      if (
        !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
      ) {
        setImageError(
          `El archivo "${file.name}" tiene un formato no permitido. Solo se aceptan imágenes JPG, PNG o WebP.`,
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size <= 0) {
        setImageError(
          `El archivo "${file.name}" está vacío y no puede subirse.`,
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setImageError(
          `El archivo "${file.name}" supera el tamaño máximo permitido de 5 MB.`,
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      validNewItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setPendingImages((prev) => [...prev, ...validNewItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setImageError(null);

    if (category === OTHER_CATEGORY && customCategory.trim().length < 2) {
      setSubmitError(
        'Debes especificar la categoría cuando seleccionas la opción "Otra".',
      );
      return;
    }

    if (custodyMode === "campus_safe_point" && safePointName.trim().length < 2) {
      setSubmitError(
        "Debes indicar el punto seguro del campus donde entregaste el objeto.",
      );
      return;
    }

    if (totalImagesCount > MAX_ITEM_IMAGES) {
      setImageError(
        `Una publicación puede tener máximo ${MAX_ITEM_IMAGES} imágenes en total.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      if (mode === "create") {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          category,
          customCategory:
            category === OTHER_CATEGORY ? customCategory.trim() : null,
          zoneId,
          location: {
            floor: floor.trim(),
            roomOrDetail: roomOrDetail.trim(),
          },
          custody:
            custodyMode === "campus_safe_point"
              ? {
                  mode: "campus_safe_point" as const,
                  verificationQuestion: null,
                  safePointName: safePointName.trim(),
                }
              : {
                  mode: "personal" as const,
                  verificationQuestion: verificationQuestion.trim() || null,
                  safePointName: null,
                },
          tags,
          foundAt: new Date(`${foundAt}T12:00:00.000Z`).toISOString(),
        };
        formData.append("payload", JSON.stringify(payload));
      } else {
        const initialTags = initialItem?.tags ?? [];
        const addTags = tags.filter((t) => !initialTags.includes(t));
        const removeTags = initialTags.filter((t) => !tags.includes(t));

        const payload: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim(),
          category,
          customCategory:
            category === OTHER_CATEGORY ? customCategory.trim() : null,
          zoneId,
          location: {
            floor: floor.trim(),
            roomOrDetail: roomOrDetail.trim(),
          },
          custody:
            custodyMode === "campus_safe_point"
              ? {
                  mode: "campus_safe_point" as const,
                  verificationQuestion: null,
                  safePointName: safePointName.trim(),
                }
              : {
                  mode: "personal" as const,
                  verificationQuestion: verificationQuestion.trim() || null,
                  safePointName: null,
                },
          foundAt: new Date(`${foundAt}T12:00:00.000Z`).toISOString(),
        };

        if (addTags.length > 0) payload.addTags = addTags;
        if (removeTags.length > 0) payload.removeTags = removeTags;
        if (removedImageKeys.length > 0) {
          payload.removeImageKeys = removedImageKeys;
        }

        formData.append("payload", JSON.stringify(payload));
      }

      for (const pending of pendingImages) {
        formData.append("images", pending.file);
      }

      const endpoint =
        mode === "create" ? "/api/items" : `/api/items/${initialItem!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(endpoint, {
        method,
        body: formData,
        credentials: "same-origin",
      });

      const data = (await response.json()) as {
        item?: FoundItemDetailDTO;
      } & ApiErrorShape;

      if (!response.ok || !data.item) {
        setSubmitError(
          data.error?.message ??
            "No se pudo guardar la publicación. Revisa los datos e intenta nuevamente.",
        );
        return;
      }

      router.push(`/items/${data.item.id}`);
      router.refresh();
    } catch {
      setSubmitError(
        "Ocurrió un error de conexión al guardar la publicación. Tus datos siguen en el formulario para que puedas reintentar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-md border border-rule bg-bone p-5 sm:p-8"
    >
      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-alert-line bg-alert-wash px-4 py-3 text-sm text-alert"
        >
          {submitError}
        </div>
      )}

      {/* 1. Datos generales */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-ink">
          1. Información general del objeto
        </h2>

        <div>
          <label
            htmlFor="item-title"
            className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
          >
            Título *
          </label>
          <input
            id="item-title"
            type="text"
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Audífonos inalámbricos negros con estuche"
            className="w-full rounded-sm border border-rule-strong px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="item-description"
            className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
          >
            Descripción general *
          </label>
          <textarea
            id="item-description"
            required
            minLength={5}
            maxLength={2000}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el objeto de forma general (color, tipo, lugar aproximado) sin revelar el detalle único que solo conoce el dueño."
            className="w-full rounded-sm border border-rule-strong px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="item-category"
              className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Categoría *
            </label>
            <select
              id="item-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ItemCategory)}
              className="w-full rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            >
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="item-found-at"
              className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Fecha de hallazgo *
            </label>
            <input
              id="item-found-at"
              type="date"
              required
              max={getTodayDateString()}
              value={foundAt}
              onChange={(e) => setFoundAt(e.target.value)}
              className="w-full rounded-sm border border-rule-strong px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
          </div>
        </div>

        {category === OTHER_CATEGORY && (
          <div>
            <label
              htmlFor="item-custom-category"
              className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Especifica la categoría *
            </label>
            <input
              id="item-custom-category"
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Ej. Termo deportivo, calculadora científica..."
              className="w-full rounded-sm border border-rule-strong px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* 2. Ubicación en Sede B - Cedesarrollo */}
      <div className="space-y-4 border-t border-rule pt-6">
        <h2 className="text-base font-semibold text-ink">
          2. Ubicación en Sede B — Cedesarrollo
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="item-zone"
              className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Zona o bloque *
            </label>
            <select
              id="item-zone"
              required
              value={zoneId}
              onChange={(e) => handleZoneChange(e.target.value)}
              className="w-full rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="item-floor"
              className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Piso *
            </label>
            <select
              id="item-floor"
              required
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            >
              {availableFloors.map((fl) => (
                <option key={fl} value={fl}>
                  {fl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedZone && (
          <p className="rounded-sm bg-paper px-3.5 py-2 text-xs text-sepia">
            <strong className="font-medium text-ink">
              Referencias de {selectedZone.name}:
            </strong>{" "}
            {selectedZone.landmarks.join(" · ")}
          </p>
        )}

        <div>
          <label
            htmlFor="item-room"
            className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
          >
            Salón o referencia exacta *
          </label>
          <input
            id="item-room"
            type="text"
            required
            minLength={1}
            maxLength={150}
            value={roomOrDetail}
            onChange={(e) => setRoomOrDetail(e.target.value)}
            placeholder="Ej. E203 - Laboratorio de cómputo, C302, Mesas de cafetería..."
            className="w-full rounded-sm border border-rule-strong px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Modalidad de custodia */}
      <div className="space-y-4 border-t border-rule pt-6">
        <h2 className="text-base font-semibold text-ink">
          3. Modalidad de custodia
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition ${
              custodyMode === "personal"
                ? "border-cobalt bg-cobalt-wash/60 ring-1 ring-cobalt"
                : "border-rule hover:bg-paper"
            } ${isLockedToCampusCustody ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="custodyMode"
              value="personal"
              checked={custodyMode === "personal"}
              disabled={isLockedToCampusCustody}
              onChange={() => setCustodyMode("personal")}
              className="mt-1 accent-cobalt"
            />
            <div>
              <span className="block text-sm font-semibold text-ink">
                Conservo el objeto (Custodia personal)
              </span>
              <span className="mt-0.5 block text-xs text-sepia">
                Recibirás solicitudes de reclamo y podrás verificar al verdadero
                dueño antes de compartir tu contacto.
              </span>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition ${
              custodyMode === "campus_safe_point"
                ? "border-brick bg-brick-wash/60 ring-1 ring-brick"
                : "border-rule hover:bg-paper"
            }`}
          >
            <input
              type="radio"
              name="custodyMode"
              value="campus_safe_point"
              checked={custodyMode === "campus_safe_point"}
              onChange={() => setCustodyMode("campus_safe_point")}
              className="mt-1 accent-brick"
            />
            <div>
              <span className="block text-sm font-semibold text-ink">
                Lo entregué en un punto seguro del campus
              </span>
              <span className="mt-0.5 block text-xs text-sepia">
                Se publicará en estado permanente{" "}
                <strong>En custodia del campus</strong> indicando dónde
                reclamarlo.
              </span>
            </div>
          </label>
        </div>

        {isLockedToCampusCustody && (
          <p className="text-xs text-brick-deep">
            Esta publicación ya fue entregada en un punto seguro del campus y no
            puede volver a custodia personal.
          </p>
        )}

        {custodyMode === "personal" ? (
          <div className="space-y-3 rounded-md border border-ochre-line bg-ochre-wash/80 p-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-base" aria-hidden="true">
                💡
              </span>
              <div className="text-xs leading-relaxed text-ochre">
                <strong className="font-semibold">
                  Recomendación de verificación:
                </strong>{" "}
                describe solo lo general del objeto y{" "}
                <strong>reserva un detalle privado único</strong> (por ejemplo:
                fondo de pantalla, contenido interior, número de serial, llavero
                o sticker) para confirmar que quien lo reclame sea su verdadero
                dueño.
              </div>
            </div>

            <div>
              <label
                htmlFor="item-verification-question"
                className="mb-1.5 block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
              >
                Pregunta de verificación (opcional)
              </label>
              <input
                id="item-verification-question"
                type="text"
                maxLength={300}
                value={verificationQuestion}
                onChange={(e) => setVerificationQuestion(e.target.value)}
                placeholder="Ej. ¿Qué sticker tiene en la tapa o qué marca es?"
                className="w-full rounded-sm border border-ochre-line bg-bone px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 rounded-md border border-brick-line bg-brick-wash/60 p-4">
            <label
              htmlFor="item-safe-point"
              className="block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Punto seguro donde entregaste el objeto *
            </label>
            <select
              id="item-safe-point"
              required
              value={safePointName}
              onChange={(e) => setSafePointName(e.target.value)}
              className="w-full rounded-sm border border-brick-line bg-bone px-3.5 py-2 text-sm text-ink focus:border-brick focus:ring-2 focus:ring-brick/15 focus:outline-none"
            >
              {SAFE_POINTS.map((point) => (
                <option key={point} value={point}>
                  {point}
                </option>
              ))}
              {safePointName &&
                !(SAFE_POINTS as readonly string[]).includes(safePointName) && (
                  <option value={safePointName}>{safePointName}</option>
                )}
            </select>
          </div>
        )}
      </div>

      {/* 4. Etiquetas */}
      <div className="space-y-3 border-t border-rule pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">
            4. Etiquetas o características (opcional)
          </h2>
          <span className="font-mono text-xs text-sepia">{tags.length}/15</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Escribe una etiqueta (ej. negro, bluetooth) y presiona Enter"
            maxLength={30}
            className="flex-1 rounded-sm border border-rule-strong px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-shade"
          >
            Agregar
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-sm border border-cobalt-line bg-cobalt-wash px-2 py-0.5 font-mono text-xs text-cobalt"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Quitar etiqueta ${tag}`}
                  className="cursor-pointer rounded-sm text-cobalt hover:text-alert"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5. Fotografías (0–3) */}
      <div className="space-y-3 border-t border-rule pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              5. Fotografías del objeto (opcional, máximo 3)
            </h2>
            <p className="text-xs text-sepia">
              Formatos permitidos: JPG, PNG o WebP. Tamaño máximo: 5 MB por
              imagen.
            </p>
          </div>
          <span className="text-xs font-medium text-sepia">
            {totalImagesCount}/{MAX_ITEM_IMAGES}
          </span>
        </div>

        {imageError && (
          <div
            role="alert"
            className="rounded-md border border-alert-line bg-alert-wash px-4 py-2.5 text-sm text-alert"
          >
            {imageError}
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            disabled={totalImagesCount >= MAX_ITEM_IMAGES}
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-sm border border-dashed border-rule-strong bg-paper px-4 py-3 text-sm text-sepia file:mr-4 file:cursor-pointer file:rounded-sm file:border-0 file:bg-cobalt file:px-3.5 file:py-1.5 file:text-sm file:font-semibold file:text-bone hover:file:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {(existingImages.length > 0 || pendingImages.length > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {existingImages.map((img) => (
              <div
                key={img.key}
                className="relative overflow-hidden rounded-md border border-rule bg-paper"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt="Imagen actual de la publicación"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex items-center justify-between px-2.5 py-2 text-xs text-sepia">
                  <span>{formatFileSize(img.sizeBytes)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(img.key)}
                    className="cursor-pointer font-medium text-alert hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}

            {pendingImages.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-md border border-cobalt-line bg-cobalt-wash/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs text-sepia">
                  <span className="truncate">
                    {item.file.name} ({formatFileSize(item.file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePendingImage(item.id)}
                    className="shrink-0 cursor-pointer font-medium text-alert hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-rule pt-6">
        <Link
          href={mode === "edit" && initialItem ? `/items/${initialItem.id}` : "/"}
          className="rounded-sm border border-rule-strong bg-bone px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-shade"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer rounded-sm bg-cobalt px-5 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Guardando..."
            : mode === "create"
              ? "Publicar objeto encontrado"
              : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
