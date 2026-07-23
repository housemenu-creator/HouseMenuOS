/**
 * Seed business knowledge documents into Firebase RTDB.
 * Estos docs son cargados por syncBranchKnowledge() en cada startup
 * y sirven como contexto RAG para que el bot entienda el negocio.
 */
import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";

const config = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "",
  projectId: process.env.FIREBASE_PROJECT_ID || "",
};

const app = initializeApp(config, "seed-knowledge");

async function main() {
  // Auth
  const email = process.env.BOT_FIREBASE_EMAIL;
  const password = process.env.BOT_FIREBASE_PASSWORD;
  if (!email || !password) {
    console.error("Faltan BOT_FIREBASE_EMAIL y/o BOT_FIREBASE_PASSWORD");
    process.exit(1);
  }
  await signInWithEmailAndPassword(getAuth(app), email, password);
  console.log("✅ Autenticado en Firebase");

  const db = getDatabase(app);
  const baseRef = ref(db, `branches/${branchId}/knowledge`);

  const docs: Record<string, any> = {
    restaurante_concepto: {
      title: "Sobre el Restaurante",
      source: "knowledge",
      category: "Negocio",
      content: `Somos un restaurante de comida peruana ubicado en Monteverde. 
Nuestra especialidad es la cocina tradicional peruana con un toque moderno. 
Ofrecemos desayunos, almuerzos y cenas, con opciones de delivery y para llevar.
Nuestros platos más destacados son los ceviches, los saltados, las parrillas y los cafés especiales.
Tenemos opciones fit, menús ejecutivos y platos a la carta.`,
    },
    platos_estrella: {
      title: "Platos Estrella y Recomendaciones",
      source: "knowledge", 
      category: "Ventas",
      content: `Platos más populares del restaurante:

PARRILLA Y POLLOS:
- Pechuga a la Plancha: S/ 20 - Arroz, papas fritas, huevo frito, plátanos fritos y bebida.
- Fuente de Chicharrones: S/ 25 - Perfecta para compartir.
- Pollo Saltado a lo Pobre: S/ 17 - Pollo saltado con arroz y papas fritas.

CARNES Y SALTADOS:
- Lomo Saltado: S/ 18 - El clásico, papas fritas y arroz + refresco.
- Chuleta de Chancho: S/ 24 - Completa con arroz, papas, ensalada, huevo frito, plátanos y bebida.
- Bisteck a lo Pobre: S/ 19 - Arroz, menestra, papas fritas y ensalada.

CEVICHES (especialidad de la casa):
- Ceviche de Filete: S/ 25 - Ceviche clásico de pescado.
- Ceviche Mixto: S/ 30 - La combinación perfecta.
- Ceviche + Chicharrón: S/ 35-45 - El favorito de los clientes.

CAFÉS ESPECIALES:
- Café Pasado 8oz: S/ 5.50 - Nuestro café filtrado tradicional.
- Cappuccino: S/ 8.50 - Clásico italiano.
- Affogato: S/ 9 - Espresso sobre helado.

BEBIDAS REFRESCANTES:
- Chicha Morada 1L: S/ 6 - Tradicional peruana.
- Limonada 1L: S/ 6 - Natural y refrescante.

RECOMENDACIONES DEL CHEF:
1. Combo Ceviche + Chicharrón: S/ 45 - La experiencia completa.
2. Seco de Cabrito: S/ 20 - Plato tradición de los domingos.
3. Lomo Saltado a lo Pobre: S/ 24 - Para los que vienen con hambre.`,
    },
    combos_promos: {
      title: "Combos y Promociones",
      source: "knowledge",
      category: "Ventas",
      content: `COMBOS ESPECIALES DEL RESTAURANTE:

1. COMBO CLUB SANDWICH: S/ 40
   Club Sandwich Clásico + Papas Fritas + 2 Milkshakes
   Ideal para compartir en pareja.

2. PROMO CAFÉ MAÑANERO:
   2 Cafés Pasados por S/ 10 (ahorras S/ 1 por cada uno).
   Perfecto para compartir.

3. COMBOS CEVICHEROS:
   - Ceviche + Chicharrón (Filete): S/ 35
   - Ceviche + Chicharrón (Congrio): S/ 40
   - Ceviche + Chicharrón (Mixto): S/ 40
   - Combo Ceviche + Chicharrón: S/ 45 (el más completo)

4. OPCIONES DEL DÍA (menú ejecutivo):
   Todos incluyen refresco.
   - Pollo al Horno: S/ 18
   - Lomo Saltado: S/ 18
   - Seco de Cabrito: S/ 20

CONSEJOS DE VENTA:
- Siempre ofrecer bebida con el pedido (sube el ticket promedio)
- Si piden un plato, ofrecer un adicional (huevo frito S/ 2, plátanos S/ 2)
- Para 2 personas, recomendar el Club Sandwich Combo
- Los cafes son buen upsell después del almuerzo`,
    },
    consejos_venta: {
      title: "Guía de Ventas para el Bot",
      source: "knowledge",
      category: "Ventas",
      content: `GUÍA DE VENTAS: Cómo vender más en cada interacción

1. PRIMER CONTACTO:
   - Saludar y OFRECER el menú inmediatamente
   - Mencionar 2-3 platos destacados del día
   - Ej: "¡Hola! Hoy tenemos Lomo Saltado, Seco de Cabrito y nuestro Ceviche Mixto. ¿Qué te gustaría pedir?"

2. UPSELLING (siempre):
   - Si piden un plato principal: "¿Quieres agregar una bebida? Tenemos chicha morada, limonada o maracuyá"
   - Si piden un ceviche: "¿Te animas por el Combo Ceviche + Chicharrón? Solo S/ 10 más y llevas chicharrón"
   - Si piden café: "¿Quieres un cafecito pasado? O si prefieres algo frío, tenemos Iced Coffee"

3. CROSS-SELLING:
   - Ofrecer adicionales: huevo frito (S/ 2), plátanos fritos (S/ 2), ensalada (S/ 5)
   - Para mesa: recomendar Fuente de Chicharrones S/ 25 para compartir
   - Post-café: ofrecer Affogato o Milkshake de postre

4. CLIENTE FRECUENTE:
   - "Vi que te encanta el Lomo Saltado. ¿Quieres el de siempre o pruebas algo nuevo?"
   - "Tienes puntos acumulados, ¿quieres canjearlos?"
   - Ofrecer el plato favorito que pidió antes

5. CIERRE:
   - Confirmar el pedido completo con montos
   - Preguntar si necesita algo más antes de finalizar
   - Dar un estimado de tiempo de preparación`,
    },
    politicas_atencion: {
      title: "Políticas de Atención",
      source: "knowledge",
      category: "Reglas",
      content: `POLÍTICAS DEL RESTAURANTE:

HORARIO DE ATENCIÓN:
- Abierto todos los días
- Horario regular: consultar en info_restaurante

DELIVERY:
- Costo de delivery según zona (usar calcular_costo_zona)
- Pedido mínimo para delivery: consultar políticas
- Tiempo estimado: 30-45 min dependiendo de la zona

FORMA DE PAGO:
- Efectivo
- Yape / Plin
- Tarjeta (POS)

PEDIDOS:
- El cliente puede modificar su pedido mientras esté en estado "recibido"
- Una vez en "preparando" ya no se puede modificar
- Se puede cancelar solo si el estado es "recibido"
- Los pedidos por delivery requieren dirección y referencia
- Los pedidos para recoger en local no necesitan dirección

FIDELIDAD:
- Los clientes acumulan puntos por cada pedido
- Los puntos se pueden canjear en futuros pedidos
- Los clientes frecuentes tienen acceso a promociones exclusivas`,
    },
    categorias_menu: {
      title: "Guía de Categorías del Menú",
      source: "knowledge",
      category: "Menu",
      content: `GUÍA DE CATEGORÍAS DEL MENÚ:

1. PROMOS DEL DÍA - Platos del día rotativos, precio especial
2. OPCIONES DEL DÍA - Menú ejecutivo con refresco incluido
3. NUESTRAS EXPERIENCIAS - Platos especiales o combos creativos
4. ALMUERZO FIT - Opciones saludables con refresco sin azúcar
5. CARNES Y SALTADOS - Platos fuertes, contundentes
6. PARRILLA Y POLLOS - Pollo a la parrilla y chicharrones
7. CEVICHES - Nuestra especialidad, pescado fresco
8. PESCADOS - Platos de pescado frito y más
9. BEBIDAS CALIENTES - Café de especialidad
10. BEBIDAS FRÍAS - Café helado y frappés
11. JUGOS NATURALES - Fruta fresca
12. MILKSHAKES - Cremosos y helados
13. BEBIDAS REFRESCANTES - Chicha, limonada, maracuyá
14. ADICIONALES - Huevo, plátanos, ensalada
15. ESPECIALES - Sandwich Club y combos`,
    },
  };

  for (const [id, doc] of Object.entries(docs)) {
    await set(ref(db, `branches/${branchId}/knowledge/${id}`), doc);
    console.log(`  ✅ ${id}: ${doc.title}`);
  }

  console.log(`\n✅ ${Object.keys(docs).length} documentos de conocimiento guardados en branches/${branchId}/knowledge/`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
