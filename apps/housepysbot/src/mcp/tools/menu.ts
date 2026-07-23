import { initFirebase, ref, get, child, update, push, set } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

const cp = (branchId: string) => `branches/${branchId}/catalog`;

export const menuTools: MCPTool[] = [
  {
    name: "ver_menu",
    description: "Muestra los productos del menú disponibles, agrupados por categoría. Puedes filtrar por categoría y paginar los resultados.",
    parameters: {
      sucursal: { type: "string", description: "ID de sucursal para ver su menú (opcional, default la actual)" },
      categoria: { type: "string", description: "Filtrar por categoría, ej: \"Entradas\", \"Platos de Fondo\", \"Bebidas\" (opcional)" },
      pagina: { type: "string", description: "Número de página para paginación, ej: \"1\", \"2\" (opcional, default 1)" },
    },
    async execute(args, branchId) {
      try {
        const bid = String(args.sucursal || branchId);
        const snapshot = await get(child(ref(db), cp(bid)));
        if (!snapshot.exists()) return { success: false, error: "El menú no está disponible" };
        const catalog = snapshot.val();
        const products = catalog?.products ? Object.values(catalog.products) as any[] : [];
        const available = products.filter((p: any) => p.available !== false);
        if (available.length === 0) return { success: true, message: "No hay productos disponibles en este momento." };

        // Filter by category
        const catFilter = String(args.categoria || "").toLowerCase().trim();
        const filtered = catFilter
          ? available.filter((p: any) => (p.category || "General").toLowerCase().includes(catFilter))
          : available;

        if (filtered.length === 0) {
          const cats = [...new Set(available.map((p: any) => p.category || "General"))];
          return { success: true, message: `No encontré productos en "${args.categoria}". Categorías disponibles: ${cats.join(", ")}` };
        }

        // Group by category
        const grouped: Record<string, any[]> = {};
        for (const p of filtered) {
          const cat = p.category || "General";
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(p);
        }

        // Flatten for pagination
        const flat: Array<{ cat: string; p: any }> = [];
        for (const [cat, items] of Object.entries(grouped)) {
          for (const p of items) {
            flat.push({ cat, p });
          }
        }

        const pageSize = 15;
        const page = Math.max(1, parseInt(String(args.pagina || "1")));
        const totalPages = Math.ceil(flat.length / pageSize);
        const start = (page - 1) * pageSize;
        const pageItems = flat.slice(start, start + pageSize);

        let msg = "📋 *MENÚ*";
        if (catFilter) msg += ` — ${args.categoria}`;
        msg += `\n(pág ${page}/${totalPages} — ${filtered.length} productos)\n\n`;

        let lastCat = "";
        for (const { cat, p } of pageItems) {
          if (cat !== lastCat) {
            msg += `📁 *${cat}*\n`;
            lastCat = cat;
          }
          msg += `  • ${p.name} — S/ ${Number(p.base_price ?? p.price ?? 0).toFixed(2)}` +
            (p.description ? `\n    ${p.description}` : "") + "\n";
        }

        if (page < totalPages) {
          msg += `\n📄 Usa "ver menú página ${page + 1}" para ver más`;
        }

        return { success: true, data: { page, totalPages, total: flat.length, items: pageItems }, message: msg.trim() };
      } catch (e: any) {
        return { success: false, error: `Error al obtener menú: ${e.message}` };
      }
    },
  },
  {
    name: "buscar_producto",
    description: "Busca productos en el menú por nombre o descripción",
    parameters: {
      q: { type: "string", description: "Término de búsqueda" },
      sucursal: { type: "string", description: "ID de sucursal para buscar en su menú (opcional, default la actual)" },
    },
    async execute(args, branchId) {
      try {
        const bid = String(args.sucursal || branchId);
        const snapshot = await get(child(ref(db), `${cp(bid)}/products`));
        if (!snapshot.exists()) return { success: false, error: "El menú no está disponible" };
        const products = snapshot.val() as Record<string, any>;
        const q = String(args.q || "").toLowerCase();

        const results = Object.entries(products)
          .filter(([, p]) =>
            p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
          )
          .map(([id, p]) => ({ id, ...p }));

        if (results.length === 0) return { success: true, message: `No encontré nada para "${args.q}" en el menú.` };

        let msg = `🔍 Resultados para "${args.q}":\n\n`;
        msg += results.map((p: any) =>
          `🍽 *${p.name}* — S/ ${Number(p.base_price ?? p.price ?? 0).toFixed(2)}` +
          (p.description ? `\n  ${p.description}` : "")
        ).join("\n\n");
        return { success: true, data: results, message: msg };
      } catch (e: any) {
        return { success: false, error: `Error al buscar: ${e.message}` };
      }
    },
  },
  {
    name: "toggle_disponible",
    description: "Activa o desactiva la disponibilidad de un producto en el menú",
    parameters: {
      nombre: { type: "string", description: "Nombre del producto a modificar" },
      disponible: { type: "string", description: "\"si\" para activar, \"no\" para desactivar" },
    },
    async execute(args, branchId) {
      try {
        const snapshot = await get(child(ref(db), `${cp(branchId)}/products`));
        if (!snapshot.exists()) return { success: false, error: "El menú no está disponible" };
        const products = snapshot.val() as Record<string, any>;
        const q = String(args.nombre || "").toLowerCase();

        const entry = Object.entries(products).find(([, p]) => p.name?.toLowerCase().includes(q));
        if (!entry) return { success: false, error: `No encontré "${args.nombre}" en el menú` };

        const [prodId] = entry;
        const disponible = String(args.disponible || "").toLowerCase() === "si";
        await update(child(ref(db), `${cp(branchId)}/products/${prodId}`), { available: disponible });

        return { success: true, message: `"${entry[1].name}" ahora está ${disponible ? "disponible" : "no disponible"}` };
      } catch (e: any) {
        return { success: false, error: `Error al cambiar disponibilidad: ${e.message}` };
      }
    },
  },
  {
    name: "actualizar_precio",
    description: "Cambia el precio de un producto del menú",
    parameters: {
      nombre: { type: "string", description: "Nombre del producto" },
      precio: { type: "string", description: "Nuevo precio en soles, ej: \"25.50\"" },
    },
    async execute(args, branchId) {
      try {
        const snapshot = await get(child(ref(db), `${cp(branchId)}/products`));
        if (!snapshot.exists()) return { success: false, error: "El menú no está disponible" };
        const products = snapshot.val() as Record<string, any>;
        const q = String(args.nombre || "").toLowerCase();

        const entry = Object.entries(products).find(([, p]) => p.name?.toLowerCase().includes(q));
        if (!entry) return { success: false, error: `No encontré "${args.nombre}" en el menú` };

        const [prodId, prod] = entry;
        const precio = parseFloat(String(args.precio || "0"));
        if (isNaN(precio) || precio <= 0) return { success: false, error: "Precio inválido" };

        await update(child(ref(db), `${cp(branchId)}/products/${prodId}`), { base_price: precio, price: precio });
        return { success: true, message: `"${prod.name}" ahora cuesta S/ ${precio.toFixed(2)}` };
      } catch (e: any) {
        return { success: false, error: `Error al actualizar precio: ${e.message}` };
      }
    },
  },
  {
    name: "crear_producto",
    description: "Agrega un nuevo producto al menú del restaurante",
    parameters: {
      nombre: { type: "string", description: "Nombre del producto" },
      precio: { type: "string", description: "Precio en soles, ej: \"25.00\"" },
      categoria: { type: "string", description: "Categoría, ej: \"Platos de Fondo\", \"Entradas\", \"Bebidas\" (opcional)" },
      descripcion: { type: "string", description: "Descripción del producto (opcional)" },
    },
    async execute(args, branchId) {
      try {
        const precio = parseFloat(String(args.precio || "0"));
        if (isNaN(precio) || precio <= 0) return { success: false, error: "Precio inválido" };

        const productsRef = child(ref(db), `${cp(branchId)}/products`);
        const newRef = push(productsRef);
        await set(newRef, {
          name: String(args.nombre || ""),
          base_price: precio,
          price: precio,
          category: String(args.categoria || "General"),
          description: String(args.descripcion || ""),
          available: true,
          createdAt: new Date().toISOString(),
        });
        return { success: true, message: `"${args.nombre}" agregado al menú — S/ ${precio.toFixed(2)}` };
      } catch (e: any) {
        return { success: false, error: `Error al crear producto: ${e.message}` };
      }
    },
  },
];
