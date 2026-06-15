import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Play, CheckCircle, XCircle } from "lucide-react";

const ALL_TOOLS = [
  { name: "ver_menu", description: "Muestra el menú completo con todos los productos disponibles", params: {} },
  { name: "buscar_producto", description: "Busca productos por nombre o descripción", params: { q: "string" } },
  { name: "crear_pedido", description: "Crea un nuevo pedido con productos del menú", params: { cliente: "string", items: "string" } },
  { name: "consultar_pedido", description: "Consulta el estado de un pedido por su ID", params: { id: "string" } },
  { name: "cambiar_estado_pedido", description: "Actualiza el estado de un pedido", params: { id: "string", estado: "string" } },
  { name: "cancelar_pedido", description: "Cancela un pedido existente", params: { id: "string" } },
  { name: "toggle_disponible", description: "Activa o desactiva un producto del menú", params: { nombre: "string", disponible: "string" } },
  { name: "actualizar_precio", description: "Cambia el precio de un producto", params: { nombre: "string", precio: "string" } },
  { name: "crear_producto", description: "Agrega un nuevo producto al menú", params: { nombre: "string", precio: "string" } },
  { name: "ver_stock", description: "Muestra los niveles de stock actuales", params: {} },
  { name: "ajustar_stock", description: "Ajusta el stock de un producto", params: { nombre: "string", cantidad: "string" } },
  { name: "alertas_stock_bajo", description: "Productos con stock bajo", params: {} },
  { name: "info_restaurante", description: "Muestra la información del restaurante", params: {} },
  { name: "actualizar_horario", description: "Cambia el horario de atención", params: { horario: "string" } },
  { name: "actualizar_delivery", description: "Configura costo y free threshold", params: {} },
  { name: "calcular_costo_zona", description: "Calcula costo de delivery", params: { direccion: "string" } },
  { name: "ver_repartidores", description: "Lista repartidores disponibles", params: {} },
  { name: "asignar_repartidor", description: "Asigna un repartidor a un pedido", params: { pedido_id: "string", repartidor_nombre: "string" } },
  { name: "crear_zona_delivery", description: "Crea nueva zona de delivery", params: { nombre: "string", costo: "string" } },
  { name: "actualizar_zona_delivery", description: "Modifica zona existente", params: { nombre: "string" } },
  { name: "resumen_dia", description: "Resumen de ventas del día", params: {} },
  { name: "abrir_turno", description: "Abre turno de caja", params: { monto_inicial: "string", encargado: "string" } },
  { name: "cerrar_turno", description: "Cierra turno de caja", params: { monto_final: "string" } },
  { name: "ventas_por_metodo", description: "Ventas por método de pago", params: {} },
  { name: "generar_cpe", description: "Genera Factura o Boleta", params: { pedido_id: "string" } },
  { name: "historial_cpes", description: "Historial de comprobantes", params: {} },
];

export default function MCPExplorer() {
  const [search, setSearch] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const filtered = ALL_TOOLS.filter(
    (t) => t.name.includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
  );

  const testTool = async (name: string) => {
    setTesting(name);
    setResult(null);
    try {
      const branchId = import.meta.env.VITE_HUB_BRANCH || "default";
      const res = await fetch(`/api/mcp/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      });
      const data = await res.json();
      setResult(data.message || JSON.stringify(data));
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    }
    setTesting(null);
  };

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl">
      <div className="p-3 border-b border-cm-border">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cm-text-secondary" />
          <input
            className="w-full bg-cm-bg border border-cm-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-cm-accent"
            placeholder="Buscar herramientas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="divide-y divide-cm-border max-h-[500px] overflow-y-auto">
        {filtered.map((tool) => (
          <div key={tool.name} className="px-4 py-3 hover:bg-cm-border/20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-sm font-medium">{tool.name}</span>
                <p className="text-xs text-cm-text-secondary mt-0.5">{tool.description}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => testTool(tool.name)}
                disabled={testing === tool.name}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-cm-accent/10 text-cm-accent hover:bg-cm-accent/20 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {testing === tool.name ? "..." : <><Play size={10} /> Probar</>}
              </motion.button>
            </div>
            {tool.params && Object.keys(tool.params).length > 0 && (
              <div className="flex gap-1 mt-1.5">
                {Object.entries(tool.params).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-cm-border/50 text-cm-text-secondary">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            )}
            {result && testing !== tool.name && (
              <div className="mt-2 text-xs p-2 rounded bg-cm-bg border border-cm-border">
                {result}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-cm-border text-xs text-cm-text-secondary">
        {filtered.length} herramientas — {ALL_TOOLS.length} totales
      </div>
    </div>
  );
}
