import { Printer } from "lucide-react";
import type { Order } from "../../types";

interface Props {
  order: Order;
  onPrint?: () => void;
}

export default function ComandaPrint({ order, onPrint }: Props) {
  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Comanda #${order.id?.slice(-6)}</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; color: #000; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header h1 { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
        .header .info { font-size: 11px; margin-top: 4px; }
        .cliente { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
        .items { margin-bottom: 8px; }
        .item { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; }
        .total { border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; }
        .nota { margin-top: 8px; padding: 4px; background: #f0f0f0; font-style: italic; font-size: 11px; }
        .footer { text-align: center; margin-top: 12px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px; }
      </style>
      </head>
      <body>
        <div class="header">
          <h1>🍳 COMANDA</h1>
          <div class="info">#${order.id?.slice(-8)}</div>
          <div class="info">${new Date().toLocaleString("es-PE")}</div>
        </div>
        <div class="cliente">${order.cliente}</div>
        <div class="items">
          ${(order.items || []).map((i: any) =>
            `<div class="item"><span>${i.quantity}x ${i.name}</span><span>S/ ${(i.price * i.quantity).toFixed(2)}</span></div>`
          ).join("")}
        </div>
        <div class="total">
          <span>TOTAL</span>
          <span>S/ ${Number(order.total).toFixed(2)}</span>
        </div>
        ${order.nota ? `<div class="nota">📝 ${order.nota}</div>` : ""}
        <div class="footer">HousePySbot — houseportal.pe</div>
        <script>window.print();window.close();<\/script>
      </body>
      </html>
    `);
    win.document.close();
    onPrint?.();
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-hub-accent/10 text-hub-accent hover:bg-hub-accent/20 transition-colors"
    >
      <Printer size={12} />
      Imprimir
    </button>
  );
}
