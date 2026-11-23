import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import {
  CAMPUS_NAME,
  ITEM_CATEGORIES,
  OTHER_CATEGORY,
  SAFE_POINTS,
  type ItemCategory,
  type ItemStatus,
} from "../src/lib/catalogs.ts";
import {
  COLLECTIONS,
  closeMongoClient,
  getDb,
} from "../src/lib/mongodb.ts";
import type { ClaimDocument } from "../src/types/claim.ts";
import type {
  FoundItemDocument,
  ItemCommentDocument,
} from "../src/types/found-item.ts";
import type { UserDocument } from "../src/types/user.ts";
import type { CampusZoneDocument } from "../src/types/zone.ts";

function makeDeterministicId(namespace: string, index: number): ObjectId {
  const hex = `${namespace}${index.toString(16).padStart(16, "0")}`;
  return new ObjectId(hex);
}

/** Generador pseudoaleatorio determinístico (Mulberry32) para reproducibilidad */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

interface ZoneSeedSpec {
  code: string;
  name: string;
  description: string;
  floors: string[];
  landmarks: string[];
  sampleRooms: { floor: string; roomOrDetail: string }[];
  weight: number;
}

const ZONE_SPECS: ZoneSeedSpec[] = [
  {
    code: "BLOQUE_A",
    name: "Bloque A",
    description:
      "Salones Piso 1 (A101–A105), Bienestar Universitario (Piso 1), Biblioteca y salas semillero (Pisos 2–3), Dirección de Programa (Piso 4). Sin pisos 5 ni 6.",
    floors: ["Piso 1", "Piso 2", "Piso 3", "Piso 4"],
    landmarks: [
      "A101–A105 Salones",
      "Bienestar Universitario (Piso 1)",
      "Biblioteca y salas semillero (Pisos 2–3)",
      "Dirección de Programa (Piso 4)",
    ],
    sampleRooms: [
      { floor: "Piso 1", roomOrDetail: "A101 - Salón de clase" },
      { floor: "Piso 1", roomOrDetail: "A104 - Salón de clase" },
      { floor: "Piso 1", roomOrDetail: "Bienestar Universitario" },
      { floor: "Piso 2", roomOrDetail: "Biblioteca - Mesas de estudio" },
      { floor: "Piso 3", roomOrDetail: "Sala semillero - Biblioteca Piso 3" },
      { floor: "Piso 4", roomOrDetail: "Dirección de Programa" },
    ],
    weight: 22,
  },
  {
    code: "BLOQUE_C",
    name: "Bloque C",
    description: "Salones de clase (C101–C105, C301–C605).",
    floors: ["Piso 1", "Piso 3", "Piso 4", "Piso 5", "Piso 6"],
    landmarks: ["C101–C105 Salones Piso 1", "C301–C605 Salones"],
    sampleRooms: [
      { floor: "Piso 1", roomOrDetail: "C102 - Salón de clase" },
      { floor: "Piso 3", roomOrDetail: "C302 - Salón de clase" },
      { floor: "Piso 4", roomOrDetail: "C404 - Salón de clase" },
      { floor: "Piso 5", roomOrDetail: "C501 - Salón de clase" },
      { floor: "Piso 6", roomOrDetail: "C605 - Salón de clase" },
    ],
    weight: 16,
  },
  {
    code: "BLOQUE_D",
    name: "Bloque D",
    description:
      "Salones de clase (D101–D105, D301–D605) y baños en ambos extremos de todos los pisos.",
    floors: ["Piso 1", "Piso 3", "Piso 4", "Piso 5", "Piso 6"],
    landmarks: [
      "D101–D105 Salones Piso 1",
      "D301–D605 Salones",
      "Baños en ambos extremos de todos los pisos",
    ],
    sampleRooms: [
      { floor: "Piso 1", roomOrDetail: "D103 - Salón de clase" },
      { floor: "Piso 3", roomOrDetail: "D304 - Salón de clase" },
      { floor: "Piso 4", roomOrDetail: "Baños extremo norte Piso 4" },
      { floor: "Piso 5", roomOrDetail: "D503 - Salón de clase" },
      { floor: "Piso 6", roomOrDetail: "D602 - Salón de clase" },
    ],
    weight: 15,
  },
  {
    code: "BLOQUE_E",
    name: "Bloque E",
    description:
      "Laboratorios de cómputo y Sala de sistemas (Pisos 1–3, E101–E305, acceso por Piso 1) y Laboratorios (Pisos 4–5, E401–E505, acceso por Piso 4).",
    floors: ["Piso 1", "Piso 2", "Piso 3", "Piso 4", "Piso 5"],
    landmarks: [
      "E101–E305 Laboratorios de cómputo",
      "Sala de sistemas",
      "E401–E505 Laboratorios",
    ],
    sampleRooms: [
      { floor: "Piso 1", roomOrDetail: "E102 - Laboratorio de cómputo" },
      { floor: "Piso 2", roomOrDetail: "E203 - Laboratorio de cómputo" },
      { floor: "Piso 3", roomOrDetail: "E304 - Sala de sistemas" },
      { floor: "Piso 4", roomOrDetail: "E402 - Laboratorio" },
      { floor: "Piso 5", roomOrDetail: "E504 - Laboratorio" },
    ],
    weight: 24,
  },
  {
    code: "BLOQUE_F",
    name: "Bloque F",
    description: "Auditorio (Piso 1) y Salones de clase (F301–F605).",
    floors: ["Piso 1", "Piso 3", "Piso 4", "Piso 5", "Piso 6"],
    landmarks: ["Auditorio (Piso 1)", "F301–F605 Salones"],
    sampleRooms: [
      { floor: "Piso 1", roomOrDetail: "Auditorio - Filas centrales" },
      { floor: "Piso 3", roomOrDetail: "F301 - Salón de clase" },
      { floor: "Piso 4", roomOrDetail: "F403 - Salón de clase" },
      { floor: "Piso 5", roomOrDetail: "F502 - Salón de clase" },
      { floor: "Piso 6", roomOrDetail: "F604 - Salón de clase" },
    ],
    weight: 10,
  },
  {
    code: "ZONA_SOCIAL",
    name: "Zona social y Cafetería (Piso 2)",
    description: "Cafetería, mesas y áreas comunes del segundo piso.",
    floors: ["Piso 2"],
    landmarks: ["Cafetería Piso 2", "Mesas de descanso", "Áreas comunes"],
    sampleRooms: [
      { floor: "Piso 2", roomOrDetail: "Cafetería - Barra principal" },
      { floor: "Piso 2", roomOrDetail: "Mesas zona social cerca a escaleras" },
      { floor: "Piso 2", roomOrDetail: "Área común Piso 2 frente a Cafetería" },
    ],
    weight: 13,
  },
];

const FIRST_NAMES = [
  "Juan",
  "María",
  "Andrés",
  "Camila",
  "Santiago",
  "Valentina",
  "Mateo",
  "Laura",
  "Daniel",
  "Sofía",
  "Sebastián",
  "Isabella",
  "Carlos",
  "Daniela",
  "Miguel",
  "Mariana",
  "Nicolás",
  "Gabriela",
  "Alejandro",
  "Paula",
  "David",
  "Natalia",
  "Diego",
  "Juliana",
  "Felipe",
  "Lucía",
  "Esteban",
  "Manuela",
  "Samuel",
  "Sara",
];

const LAST_NAMES = [
  "Luna",
  "Gómez",
  "Rodríguez",
  "Martínez",
  "Torres",
  "Pérez",
  "Ramírez",
  "Hernández",
  "Castro",
  "Vargas",
  "Mendoza",
  "Rojas",
  "Díaz",
  "Morales",
  "Ortiz",
  "Gutiérrez",
  "Silva",
  "Suárez",
  "Jiménez",
  "Salazar",
];

const PROGRAMS = [
  "Tecnología en Desarrollo de Software",
  "Ingeniería de Sistemas",
  "Tecnología en Gestión Logística",
  "Administración de Empresas",
  "Contaduría Pública",
  "Tecnología en Seguridad y Salud en el Trabajo",
  "Derecho",
  "Psicología",
  "Diseño Gráfico",
  "Tecnología en Gestión de Mercadeo",
];

interface ItemTemplate {
  title: string;
  description: string;
  tags: string[];
  verificationQuestion: string;
  customCategory?: string;
}

const ITEM_TEMPLATES: Record<ItemCategory, ItemTemplate[]> = {
  Electrónica: [
    {
      title: "Audífonos inalámbricos negros con estuche",
      description:
        "Encontrados sobre un puesto de trabajo al finalizar la clase de la tarde. Están en buen estado dentro de su estuche.",
      tags: ["audífonos", "bluetooth", "negro"],
      verificationQuestion:
        "¿Qué marca son los audífonos y qué detalle o sticker tienen en el estuche?",
    },
    {
      title: "Cargador USB-C de portátil",
      description:
        "Hallado conectado a un tomacorriente debajo de la mesa. Cable enrollado con una banda.",
      tags: ["cargador", "usb-c", "portátil"],
      verificationQuestion:
        "¿De qué marca y potencia es el cargador y de qué color es la banda del cable?",
    },
    {
      title: "Memoria USB metálica plateada",
      description:
        "Encontrada en el escritorio del docente junto al computador. Tiene un accesorio pequeño colgado.",
      tags: ["usb", "memoria", "plateado"],
      verificationQuestion:
        "¿De qué capacidad es la USB y qué carpetas principales contiene?",
    },
    {
      title: "Mouse inalámbrico compacto",
      description:
        "Dejado sobre la mesa al terminar la práctica de laboratorio. Conserva su receptor USB guardado.",
      tags: ["mouse", "inalámbrico", "periférico"],
      verificationQuestion:
        "¿Qué marca es el mouse y qué marca o detalle tiene en la base?",
    },
    {
      title: "Celular con funda protectora oscura",
      description:
        "Encontrado sobre una silla al salir de clase. La pantalla está intacta y bloqueada.",
      tags: ["celular", "teléfono", "funda"],
      verificationQuestion:
        "¿Qué imagen tiene de fondo de pantalla de bloqueo y cuál es la marca del equipo?",
    },
  ],
  "Documentos y Carnés": [
    {
      title: "Carné estudiantil Tecnológico Comfenalco",
      description:
        "Encontrado en el piso cerca de la entrada. Está dentro de un portacarné plástico.",
      tags: ["carné", "estudiantil", "documento"],
      verificationQuestion:
        "¿Cuál es el nombre completo y el programa académico que aparece en el carné?",
    },
    {
      title: "Billetera oscura con documentos personales",
      description:
        "Hallada sobre una banca después del descanso. Contiene tarjetas y documentos de identidad.",
      tags: ["billetera", "documentos", "tarjetas"],
      verificationQuestion:
        "¿Qué tarjetas o documentos exactos están dentro de la billetera?",
    },
    {
      title: "Tarjeta de transporte Transcaribe",
      description:
        "Encontrada junto a la fila de la cafetería. Tiene un protector transparente.",
      tags: ["transcaribe", "tarjeta", "transporte"],
      verificationQuestion:
        "¿Qué marca o sticker distingue el protector de tu tarjeta?",
    },
    {
      title: "Carpeta plástica con certificados académicos",
      description:
        "Olvidada en una silla al finalizar la jornada de la mañana. Contiene hojas impresas.",
      tags: ["carpeta", "documentos", "certificados"],
      verificationQuestion:
        "¿A nombre de quién están los certificados dentro de la carpeta?",
    },
  ],
  Llaves: [
    {
      title: "Manojo de llaves con llavero metálico",
      description:
        "Encontrado sobre un pupitre en la parte trasera del salón. Son varias llaves pequeñas.",
      tags: ["llaves", "llavero", "metal"],
      verificationQuestion:
        "¿Cuántas llaves tiene el manojo y qué figura tiene el llavero?",
    },
    {
      title: "Llave de motocicleta con cinta",
      description:
        "Hallada cerca a las escaleras principales. Tiene una cinta de tela amarrada.",
      tags: ["llave", "moto", "cinta"],
      verificationQuestion:
        "¿De qué marca de moto es la llave y de qué color o diseño es la cinta?",
    },
    {
      title: "Llave de candado con etiqueta de color",
      description:
        "Encontrada en la mesa de estudio junto a los lockers.",
      tags: ["llave", "candado", "locker"],
      verificationQuestion:
        "¿Qué número o texto está escrito en la etiqueta de la llave?",
    },
  ],
  "Accesorios y Ropa": [
    {
      title: "Gafas formuladas con estuche rígido",
      description:
        "Encontradas sobre una mesa al terminar la jornada. Están guardadas en su estuche.",
      tags: ["gafas", "lentes", "estuche"],
      verificationQuestion:
        "¿De qué color es la montura y qué paño o detalle hay dentro del estuche?",
    },
    {
      title: "Chaqueta deportiva con cremallera",
      description:
        "Dejada en el espaldar de una silla al finalizar la clase de la noche.",
      tags: ["chaqueta", "ropa", "buzo"],
      verificationQuestion:
        "¿Qué talla y marca es la chaqueta y qué había en uno de los bolsillos?",
    },
    {
      title: "Reloj de pulsera deportivo",
      description:
        "Encontrado cerca al lavamanos. La correa está en buen estado.",
      tags: ["reloj", "accesorio", "deportivo"],
      verificationQuestion:
        "¿Qué marca es el reloj y qué detalle tiene en la correa o pantalla?",
    },
    {
      title: "Gorra de tela oscura",
      description:
        "Olvidada en una de las mesas durante el receso del mediodía.",
      tags: ["gorra", "accesorio", "ropa"],
      verificationQuestion:
        "¿Qué logo o bordado tiene en la parte frontal o lateral?",
    },
  ],
  "Libros y Útiles": [
    {
      title: "Cuaderno argollado de apuntes",
      description:
        "Encontrado debajo de un pupitre al finalizar la clase. Tiene varias materias escritas.",
      tags: ["cuaderno", "apuntes", "útiles"],
      verificationQuestion:
        "¿Qué nombre o materia aparece en la primera hoja del cuaderno?",
    },
    {
      title: "Libro universitario de programación",
      description:
        "Hallado en una mesa de lectura con un separador de páginas adentro.",
      tags: ["libro", "lectura", "estudio"],
      verificationQuestion:
        "¿Qué título exacto tiene el libro y qué diseño tiene el separador?",
    },
    {
      title: "Calculadora científica con tapa deslizable",
      description:
        "Olvidada sobre el escritorio al terminar un parcial.",
      tags: ["calculadora", "científica", "útiles"],
      verificationQuestion:
        "¿Qué modelo es la calculadora y qué marca o inicial tiene en la parte trasera?",
    },
  ],
  "Morrales y Cartucheras": [
    {
      title: "Cartuchera de tela con cierre doble",
      description:
        "Encontrada en el suelo junto a la primera fila de sillas. Contiene útiles varios.",
      tags: ["cartuchera", "lapiceros", "útiles"],
      verificationQuestion:
        "¿Qué objeto particular guardas dentro además de lapiceros?",
    },
    {
      title: "Morral escolar mediano con varios bolsillos",
      description:
        "Hallado junto a una banca al terminar la jornada. Se conserva cerrado.",
      tags: ["morral", "bolso", "mochila"],
      verificationQuestion:
        "¿Qué marca es el morral y qué artículos principales lleva adentro?",
    },
    {
      title: "Lonchera térmica pequeña",
      description:
        "Dejada sobre una mesa después de la hora del almuerzo.",
      tags: ["lonchera", "térmica", "bolso"],
      verificationQuestion:
        "¿Qué color de recipientes contiene la lonchera?",
    },
  ],
  Otra: [
    {
      title: "Termo metálico deportivo",
      description:
        "Encontrado junto a la pared del salón al finalizar la clase.",
      tags: ["termo", "botella", "agua"],
      verificationQuestion:
        "¿Qué color y stickers o marca personalizada tiene el termo?",
      customCategory: "Termos y botellas",
    },
    {
      title: "Paraguas plegable compacto",
      description:
        "Hallado debajo de una silla después de la lluvia de la tarde.",
      tags: ["paraguas", "sombrilla", "lluvia"],
      verificationQuestion:
        "¿De qué color es la tela del paraguas y cómo es su funda?",
      customCategory: "Paraguas y sombrillas",
    },
    {
      title: "Estuche con instrumentos de dibujo técnico",
      description:
        "Olvidado sobre el mesón del aula tras la clase de diseño.",
      tags: ["dibujo", "reglas", "compás"],
      verificationQuestion:
        "¿Qué piezas exactas tiene el estuche y qué nombre aparece marcado?",
      customCategory: "Instrumentos de dibujo",
    },
  ],
};

const SAMPLE_COMMENTS = [
  "¿Estaba cerca de la ventana o en la fila del fondo?",
  "Creo que un compañero de mi grupo perdió algo parecido ayer, ya le aviso.",
  "¡Gracias por publicarlo aquí! Ojalá aparezca pronto el dueño.",
  "¿A qué hora aproximadamente lo encontraste?",
  "Voy a compartir el enlace en el grupo del salón.",
  "¿Sigue disponible todavía?",
];

const CLAIM_ANSWERS = [
  "Es mío, tiene un sticker pequeño en la parte trasera y mis iniciales marcadas.",
  "Lo dejé justo al terminar la clase de las 4:00 p. m., coincide la marca y el color interno.",
  "Puedo mostrar la factura digital de compra y fotos previas del objeto.",
  "El detalle privado corresponde a una marca en la esquina derecha y un accesorio azul.",
  "Dentro tiene mi nombre escrito con marcador negro en la etiqueta interna.",
  "El fondo de pantalla es una foto de mi mascota y la funda tiene un borde desgastado.",
];

const REJECTION_REASONS = [
  "Se aprobó otro reclamo para esta publicación.",
  "La descripción del detalle privado no coincide con el objeto encontrado.",
  "Los datos proporcionados no permitieron confirmar la propiedad.",
];

function buildZones(): { zones: CampusZoneDocument[]; weightedZoneIndexes: number[] } {
  const zones: CampusZoneDocument[] = [];
  const weightedZoneIndexes: number[] = [];

  ZONE_SPECS.forEach((spec, index) => {
    zones.push({
      _id: makeDeterministicId("67010000", index + 1),
      campusName: CAMPUS_NAME,
      code: spec.code,
      name: spec.name,
      description: spec.description,
      floors: spec.floors,
      landmarks: spec.landmarks,
      isActive: true,
    });

    for (let w = 0; w < spec.weight; w += 1) {
      weightedZoneIndexes.push(index);
    }
  });

  return { zones, weightedZoneIndexes };
}

function buildUsers(rng: () => number, now: Date): UserDocument[] {
  const passwordHash = bcrypt.hashSync("Campus2026*", 10);
  const users: UserDocument[] = [];

  for (let i = 0; i < 60; i += 1) {
    const firstName =
      i === 0
        ? "Juan"
        : i === 1
          ? "María"
          : FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName =
      i === 0
        ? "Luna"
        : i === 1
          ? "Gómez"
          : LAST_NAMES[Math.floor(i / 3) % LAST_NAMES.length];

    const email =
      i === 0
        ? "demo.estudiante@correo.edu.co"
        : i === 1
          ? "maria.gomez@correo.edu.co"
          : `estudiante.${i + 1}@correo.edu.co`;

    const daysAgo = 370 + Math.floor(rng() * 60);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    users.push({
      _id: makeDeterministicId("67020000", i + 1),
      fullName: `${firstName} ${lastName}`,
      email,
      passwordHash,
      program: PROGRAMS[i % PROGRAMS.length],
      contactPhone: `300${String(1000000 + i * 13579).slice(0, 7)}`,
      createdAt,
    });
  }

  return users;
}

function buildItemsAndClaims(
  rng: () => number,
  zones: CampusZoneDocument[],
  weightedZoneIndexes: number[],
  users: UserDocument[],
  now: Date,
): { items: FoundItemDocument[]; claims: ClaimDocument[] } {
  const items: FoundItemDocument[] = [];
  const claims: ClaimDocument[] = [];

  // Distribución exacta de 700 publicaciones:
  // 360 disponible, 150 en_custodia_campus, 50 en_reclamo, 140 devuelto
  const statusPool: ItemStatus[] = [
    ...Array<ItemStatus>(360).fill("disponible"),
    ...Array<ItemStatus>(150).fill("en_custodia_campus"),
    ...Array<ItemStatus>(50).fill("en_reclamo"),
    ...Array<ItemStatus>(140).fill("devuelto"),
  ];

  // Mezcla determinística del pool de estados
  for (let i = statusPool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [statusPool[i], statusPool[j]] = [statusPool[j], statusPool[i]];
  }

  let commentSeq = 1;
  let claimSeq = 1;

  const disponibleItems: FoundItemDocument[] = [];
  const enReclamoOrDevueltoItems: FoundItemDocument[] = [];

  for (let i = 0; i < 700; i += 1) {
    const itemId = makeDeterministicId("67030000", i + 1);
    const publisherIndex = Math.floor(rng() * users.length);
    const publisher = users[publisherIndex];

    const zoneIndex = pick(rng, weightedZoneIndexes);
    const zone = zones[zoneIndex];
    const zoneSpec = ZONE_SPECS[zoneIndex];
    const location = pick(rng, zoneSpec.sampleRooms);

    const category = ITEM_CATEGORIES[i % ITEM_CATEGORIES.length];
    const template = pick(rng, ITEM_TEMPLATES[category]);
    const status = statusPool[i];

    // Distribuir en los últimos 360 días (12 meses)
    const daysAgo = Math.floor(rng() * 360);
    const hoursOffset = Math.floor(rng() * 12);
    const foundAt = new Date(
      now.getTime() - (daysAgo * 24 + hoursOffset + 12) * 60 * 60 * 1000,
    );
    const createdAt = new Date(
      foundAt.getTime() + (1 + Math.floor(rng() * 4)) * 60 * 60 * 1000,
    );

    const isCampusCustody = status === "en_custodia_campus";
    const custody = isCampusCustody
      ? {
          mode: "campus_safe_point" as const,
          verificationQuestion: null,
          safePointName: pick(rng, SAFE_POINTS),
        }
      : {
          mode: "personal" as const,
          verificationQuestion: template.verificationQuestion,
          safePointName: null,
        };

    // Comentarios embebidos (0 a 2 comentarios en ~55% de publicaciones)
    const comments: ItemCommentDocument[] = [];
    if (rng() < 0.55) {
      const commentCount = rng() < 0.7 ? 1 : 2;
      for (let c = 0; c < commentCount; c += 1) {
        const author = users[(publisherIndex + c + 1 + Math.floor(rng() * 10)) % users.length];
        const commentCreatedAt = new Date(
          createdAt.getTime() + (c + 1) * 2 * 60 * 60 * 1000,
        );
        comments.push({
          _id: makeDeterministicId("67050000", commentSeq++),
          authorId: author._id,
          authorName: author.fullName,
          body: pick(rng, SAMPLE_COMMENTS),
          createdAt: commentCreatedAt,
        });
      }
    }

    let approvedClaimId: ObjectId | null = null;
    let returnedAt: Date | null = null;
    let updatedAt =
      comments.length > 0 ? comments[comments.length - 1].createdAt : createdAt;

    if (status === "en_reclamo" || status === "devuelto") {
      const claimId = makeDeterministicId("67040000", claimSeq++);
      const claimant = users[(publisherIndex + 1 + Math.floor(rng() * (users.length - 1))) % users.length];
      const claimCreatedAt = new Date(
        createdAt.getTime() + (2 + Math.floor(rng() * 24)) * 60 * 60 * 1000,
      );
      const claimResolvedAt = new Date(
        claimCreatedAt.getTime() + (1 + Math.floor(rng() * 12)) * 60 * 60 * 1000,
      );

      approvedClaimId = claimId;

      if (status === "devuelto") {
        // Entre 4 y 120 horas después de foundAt (realista para el reporte de tiempo promedio)
        const extraReturnHours = 2 + Math.floor(rng() * 72);
        returnedAt = new Date(
          claimResolvedAt.getTime() + extraReturnHours * 60 * 60 * 1000,
        );
        if (returnedAt > now) {
          returnedAt = new Date(now.getTime() - 60 * 60 * 1000);
        }
        updatedAt = returnedAt;
      } else {
        updatedAt = claimResolvedAt;
      }

      claims.push({
        _id: claimId,
        postId: itemId,
        claimantId: claimant._id,
        verificationAnswer: pick(rng, CLAIM_ANSWERS),
        evidenceImage: null,
        status: "approved",
        resolutionReason: null,
        createdAt: claimCreatedAt,
        resolvedAt: claimResolvedAt,
      });
    }

    const itemDoc: FoundItemDocument = {
      _id: itemId,
      publisherId: publisher._id,
      zoneId: zone._id,
      title: template.title,
      description: template.description,
      category,
      customCategory:
        category === OTHER_CATEGORY
          ? (template.customCategory ?? "Artículo vario")
          : null,
      status,
      location: {
        floor: location.floor,
        roomOrDetail: location.roomOrDetail,
      },
      custody,
      delivery: {
        approvedClaimId,
        returnedAt,
      },
      tags: [...template.tags],
      images: [],
      comments,
      foundAt,
      createdAt,
      updatedAt,
    };

    items.push(itemDoc);

    if (status === "disponible") {
      disponibleItems.push(itemDoc);
    } else if (status === "en_reclamo" || status === "devuelto") {
      enReclamoOrDevueltoItems.push(itemDoc);
    }
  }

  // Hasta aquí tenemos 190 claims (50 en_reclamo + 140 devuelto).
  // Agregamos 110 claims adicionales para llegar exactamente a 300:
  // - 50 pending (sobre publicaciones `disponible`, sin duplicar (postId, claimantId))
  // - 45 rejected (sobre publicaciones `en_reclamo`, `devuelto` o `disponible`)
  // - 15 cancelled (sobre publicaciones `disponible`, simulando entregas no concretadas)

  const usedPendingPairs = new Set<string>();

  for (let p = 0; p < 50; p += 1) {
    const item = disponibleItems[p % disponibleItems.length];
    let claimant = users[(p * 7 + 3) % users.length];
    while (
      claimant._id.equals(item.publisherId) ||
      usedPendingPairs.has(`${item._id.toHexString()}:${claimant._id.toHexString()}`)
    ) {
      claimant = users[(users.indexOf(claimant) + 1) % users.length];
    }
    usedPendingPairs.add(`${item._id.toHexString()}:${claimant._id.toHexString()}`);

    const claimCreatedAt = new Date(
      item.createdAt.getTime() + (3 + Math.floor(rng() * 36)) * 60 * 60 * 1000,
    );

    claims.push({
      _id: makeDeterministicId("67040000", claimSeq++),
      postId: item._id,
      claimantId: claimant._id,
      verificationAnswer: pick(rng, CLAIM_ANSWERS),
      evidenceImage: null,
      status: "pending",
      resolutionReason: null,
      createdAt: claimCreatedAt,
      resolvedAt: null,
    });
  }

  for (let r = 0; r < 45; r += 1) {
    const pool = r < 30 ? enReclamoOrDevueltoItems : disponibleItems;
    const item = pool[(r * 3) % pool.length];
    let claimant = users[(r * 5 + 11) % users.length];
    if (claimant._id.equals(item.publisherId)) {
      claimant = users[(users.indexOf(claimant) + 1) % users.length];
    }

    const claimCreatedAt = new Date(
      item.createdAt.getTime() + (2 + Math.floor(rng() * 20)) * 60 * 60 * 1000,
    );
    const claimResolvedAt = new Date(
      claimCreatedAt.getTime() + (2 + Math.floor(rng() * 10)) * 60 * 60 * 1000,
    );

    claims.push({
      _id: makeDeterministicId("67040000", claimSeq++),
      postId: item._id,
      claimantId: claimant._id,
      verificationAnswer: pick(rng, CLAIM_ANSWERS),
      evidenceImage: null,
      status: "rejected",
      resolutionReason:
        r < 30 ? REJECTION_REASONS[0] : pick(rng, REJECTION_REASONS.slice(1)),
      createdAt: claimCreatedAt,
      resolvedAt: claimResolvedAt,
    });
  }

  for (let c = 0; c < 15; c += 1) {
    const item = disponibleItems[(60 + c * 4) % disponibleItems.length];
    let claimant = users[(c * 11 + 5) % users.length];
    if (claimant._id.equals(item.publisherId)) {
      claimant = users[(users.indexOf(claimant) + 1) % users.length];
    }

    const claimCreatedAt = new Date(
      item.createdAt.getTime() + (4 + Math.floor(rng() * 24)) * 60 * 60 * 1000,
    );
    const claimResolvedAt = new Date(
      claimCreatedAt.getTime() + (6 + Math.floor(rng() * 24)) * 60 * 60 * 1000,
    );

    claims.push({
      _id: makeDeterministicId("67040000", claimSeq++),
      postId: item._id,
      claimantId: claimant._id,
      verificationAnswer: pick(rng, CLAIM_ANSWERS),
      evidenceImage: null,
      status: "cancelled",
      resolutionReason:
        "La entrega no se concretó; publicación revertida a disponible.",
      createdAt: claimCreatedAt,
      resolvedAt: claimResolvedAt,
    });
  }

  return { items, claims };
}

async function seedDatabase(): Promise<void> {
  const db = await getDb();
  const rng = createRng(20261122);
  const now = new Date();

  const { zones, weightedZoneIndexes } = buildZones();
  const users = buildUsers(rng, now);
  const { items, claims } = buildItemsAndClaims(
    rng,
    zones,
    weightedZoneIndexes,
    users,
    now,
  );

  await db.collection<CampusZoneDocument>(COLLECTIONS.campusZones).bulkWrite(
    zones.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })),
    { ordered: false },
  );

  await db.collection<UserDocument>(COLLECTIONS.users).bulkWrite(
    users.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })),
    { ordered: false },
  );

  await db.collection<FoundItemDocument>(COLLECTIONS.foundItems).bulkWrite(
    items.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })),
    { ordered: false },
  );

  await db.collection<ClaimDocument>(COLLECTIONS.claims).bulkWrite(
    claims.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })),
    { ordered: false },
  );

  const [zonesCount, usersCount, itemsCount, claimsCount] = await Promise.all([
    db.collection(COLLECTIONS.campusZones).countDocuments(),
    db.collection(COLLECTIONS.users).countDocuments(),
    db.collection(COLLECTIONS.foundItems).countDocuments(),
    db.collection(COLLECTIONS.claims).countDocuments(),
  ]);

  const total = zonesCount + usersCount + itemsCount + claimsCount;

  console.log("✓ Seed de Sede B — Cedesarrollo completado sin errores de $jsonSchema:");
  console.log(`  - campus_zones: ${zonesCount}`);
  console.log(`  - users:        ${usersCount}`);
  console.log(`  - found_items:  ${itemsCount}`);
  console.log(`  - claims:       ${claimsCount}`);
  console.log(`  - TOTAL:        ${total} documentos`);
}

seedDatabase()
  .catch((error) => {
    console.error("Error ejecutando seed.ts:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
