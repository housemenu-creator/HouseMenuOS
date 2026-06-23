/**
 * Genera y descarga un archivo CSV con los pedidos filtrados por sucursal.
 */

export default function exportToCSV(orders: any[], branchName: string) {
  if (!orders?.length) return;

  const headers = ['ID', 'Cliente', 'Ubicacion', 'Estado', 'Total', 'Items', 'Fecha'];
  const rows = orders.map((o) => [
    o.id,
    o.customerName,
    o.location,
    o.status,
    o.financials?.total || 0,
    (o.items || []).map((i: any) => i.name).join('; '),
    new Date(o.createdAt).toLocaleString('es-PE'),
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `house-menu-${branchName}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
