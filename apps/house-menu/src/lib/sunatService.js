import { ref, push, set, onValue, update, runTransaction } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { encrypt, decrypt } from './crypto.js';
import { fiscalPath, fiscalCredentialsPath, invoicesPath, invoiceCountersPath } from './paths';
import { formatCurrency, nowISO } from './format';

const DOC_TYPE_CONFIG = {
  '01': { label: 'Factura', seriePrefix: 'F', igvRate: 0.18, requiresRuc: true, sunatCode: '01' },
  '03': { label: 'Boleta', seriePrefix: 'B', igvRate: 0.18, requiresRuc: false, sunatCode: '03' },
  'NV': { label: 'Nota de Venta', seriePrefix: 'NV', igvRate: 0, requiresRuc: false, sunatCode: 'NV' },
};

export const sunatService = {

  // ─── Fiscal Data ────────────────────────────────────

  subscribeToFiscalData(branchId, callback) {
    const fiscalRef = ref(db, fiscalPath(branchId));
    const credRef = ref(db, fiscalCredentialsPath(branchId));
    let merged = null;
    const emit = () => { if (merged) callback({ ...merged }); };
    const unsubFiscal = onValue(fiscalRef, (snap) => {
      const data = snap.val() || {};
      merged = {
        ruc: data.ruc || '',
        razonSocial: data.razonSocial || '',
        nombreComercial: data.nombreComercial || '',
        direccion: data.direccion || '',
        urbanizacion: data.urbanizacion || '-',
        departamento: data.departamento || 'LIMA',
        provincia: data.provincia || 'LIMA',
        distrito: data.distrito || 'LIMA',
        ubigeo: data.ubigeo || '150101',
        solUser: data.solUser || '',
        solPass: '',
        certPath: data.certPath || '',
        enabled: data.enabled || false,
        defaultDocType: data.defaultDocType || 'NV',
        igvRate: data.igvRate ?? 0,
      };
      emit();
    });
    const unsubCreds = onValue(credRef, (snap) => {
      const creds = snap.val();
      if (creds?.solPass && merged) {
        decrypt(creds.solPass, branchId || 'hq').then(decrypted => {
          if (merged) { merged.solPass = decrypted; emit(); }
        });
      }
    });
    return () => { unsubFiscal(); unsubCreds(); merged = null; };
  },

  async saveFiscalData(branchId, data) {
    try {
      const { solPass, ...rest } = data;
      await set(ref(db, fiscalPath(branchId)), rest);
      if (solPass) {
        const encrypted = await encrypt(solPass, branchId || 'hq');
        await set(ref(db, fiscalCredentialsPath(branchId)), { solPass: encrypted });
      }
      return { success: true };
    } catch (error) {
      console.error('Error saving fiscal data:', error);
      return { success: false };
    }
  },

  // ─── Invoice Generation ─────────────────────────────

  async generateInvoice(branchId, order, fiscalData, docType = 'NV') {
    try {
      const docConfig = DOC_TYPE_CONFIG[docType] || DOC_TYPE_CONFIG['NV'];
      const igvRate = fiscalData?.igvRate ?? docConfig.igvRate;

      const counterRef = ref(db, invoiceCountersPath(branchId));
      let serie, correlativo;

      await runTransaction(counterRef, (current) => {
        const c = current || { factura: 0, boleta: 0, notaVenta: 0 };
        if (docType === '01') {
          c.factura = (c.factura || 0) + 1;
          serie = `F${String(c.factura).padStart(3, '0')}`;
          correlativo = c.factura;
        } else if (docType === '03') {
          c.boleta = (c.boleta || 0) + 1;
          serie = `B${String(c.boleta).padStart(3, '0')}`;
          correlativo = c.boleta;
        } else {
          c.notaVenta = (c.notaVenta || 0) + 1;
          serie = `NV${String(c.notaVenta).padStart(3, '0')}`;
          correlativo = c.notaVenta;
        }
        return c;
      });

      const invoiceId = `${serie}-${String(correlativo).padStart(8, '0')}`;
      const timestamp = nowISO();

      const invoiceData = {
        invoiceId,
        serie,
        correlativo,
        docType: docConfig.label,
        docTypeCode: docType,
        igvRate,
        ruc: docConfig.requiresRuc ? fiscalData.ruc : (fiscalData.ruc || ''),
        razonSocial: fiscalData.razonSocial || (docType === 'NV' ? 'Cualquiera' : fiscalData.razonSocial),
        customerDocType: order.customerDocType || '1',
        customerDocNum: order.customerDocNum || '-',
        customerName: order.customerName || '',
        customerAddress: order.customerAddress || '',
        orderId: order.id,
        orderTotal: order.financials?.total || order.total || 0,
        subtotal: order.financials?.subtotal || 0,
        igv: docType === 'NV' ? 0 : (order.financials?.tax_igv || 0),
        deliveryFee: order.financials?.deliveryFee || 0,
        packagingTotal: order.financials?.packaging_total || 0,
        items: (order.items || []).map(i => ({
          name: i.name,
          details: i.details || [],
          price: i.price || 0,
          quantity: i.quantity || 1,
        })),
        moneda: 'PEN',
        createdAt: timestamp,
        sunatStatus: docType === 'NV' ? 'local' : 'pending',
        sunatCdr: null,
        xmlGenerated: false,
      };

      const invoicesRef = ref(db, invoicesPath(branchId));
      const newRef = push(invoicesRef);
      await set(newRef, { id: newRef.key, ...invoiceData });

      return { success: true, invoiceId, firebaseKey: newRef.key };
    } catch (error) {
      console.error('Error generating invoice:', error);
      return { success: false, error: error.message };
    }
  },

  // ─── Invoice Queries ────────────────────────────────

  subscribeToInvoices(branchId, callback) {
    const invoicesRef = ref(db, invoicesPath(branchId));
    return onValue(invoicesRef, (snap) => {
      const data = snap.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(k => ({ id: k, ...data[k] })).sort((a, b) => (b.correlativo || 0) - (a.correlativo || 0)));
    });
  },

  async updateSunatStatus(branchId, invoiceFirebaseKey, status, cdr = null) {
    try {
      await update(ref(db, invoicesPath(branchId, invoiceFirebaseKey)), {
        sunatStatus: status,
        sunatCdr: cdr,
        updatedAt: nowISO(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating invoice status:', error);
      return { success: false };
    }
  },

  // ─── Invoice Print / PDF ────────────────────────────

  getInvoicePrintHtml(invoice) {
    const itemsHtml = (invoice.items || []).map(i =>
      `<tr><td style="font-size:9px">${i.quantity || 1}x</td><td style="font-size:9px">${i.name}${i.details?.length ? '<br/><span style="font-size:7px;color:#666">' + i.details.join(', ') + '</span>' : ''}</td><td style="font-size:9px;text-align:right">S/ ${(i.price || 0).toFixed(2)}</td></tr>`
    ).join('');

    const isNV = invoice.docType === 'Nota de Venta';
    const isFactura = invoice.docType === 'Factura';
    const docClass = isNV ? 'nv' : (isFactura ? 'factura' : 'boleta');
    const igvLabel = isNV ? 'IGV (0%)' : `IGV (${((invoice.igvRate || 0.18) * 100).toFixed(0)}%)`;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${invoice.invoiceId}</title>
<style>
  @page { margin: 6mm; size: 80mm auto; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; font-size:10px; color:#000; width:72mm; padding:3mm 0; }
  .header { text-align:center; margin-bottom:3mm; padding-bottom:2mm; border-bottom:2px solid #000; }
  .header h1 { font-size:13px; font-weight:bold; letter-spacing:2px; }
  .header .doc-type { font-size:11px; font-weight:bold; margin-top:2px; }
  .header .id { font-size:18px; font-weight:bold; letter-spacing:3px; margin:2mm 0; }
  .header .rnp { font-size:7px; margin-top:1mm; }
  .header .nv-badge { display:inline-block; background:#000; color:#fff; font-size:7px; font-weight:bold; padding:1mm 3mm; border-radius:2px; margin-top:1mm; letter-spacing:1px; }
  table { width:100%; border-collapse:collapse; }
  th, td { padding:1mm 0; text-align:left; border-bottom:1px dotted #ccc; }
  th { font-size:7px; text-transform:uppercase; }
  .totals { margin-top:2mm; }
  .totals tr:last-child td { font-size:12px; font-weight:bold; border-top:2px solid #000; padding-top:2mm; }
  .footer { text-align:center; margin-top:3mm; padding-top:2mm; border-top:2px dashed #000; font-size:7px; color:#666; }
  .data-row { font-size:8px; padding:0.5mm 0; }
</style></head><body>
  <div class="header">
    <h1>${invoice.razonSocial || 'HOUSE MENU'}</h1>
    ${!isNV ? `<div class="rnp">RUC: ${invoice.ruc || '________'}</div>` : `<div class="nv-badge">SIN RUC — NOTA DE VENTA</div>`}
    <div class="doc-type">${invoice.docType}${isNV ? '' : ' ELECTRÓNICA'}</div>
    <div class="id">${invoice.invoiceId}</div>
  </div>
  <table><tr><td class="data-row"><strong>Cliente:</strong> ${invoice.customerName}</td></tr>
  <tr><td class="data-row"><strong>${isFactura ? 'RUC' : 'DNI'}:</strong> ${invoice.customerDocNum}</td></tr>
  <tr><td class="data-row"><strong>Fecha:</strong> ${new Date(invoice.createdAt).toLocaleString('es-PE')}</td></tr></table>
  <table style="margin-top:2mm"><thead><tr><th>Cant</th><th>Producto</th><th style="text-align:right">Importe</th></tr></thead>
  <tbody>${itemsHtml}</tbody></table>
  <table class="totals">
    <tr><td>Op. Gravadas</td><td style="text-align:right">S/ ${(invoice.subtotal || 0).toFixed(2)}</td></tr>
    ${invoice.packagingTotal > 0 ? `<tr><td>Descartables</td><td style="text-align:right">S/ ${(invoice.packagingTotal || 0).toFixed(2)}</td></tr>` : ''}
    ${invoice.deliveryFee > 0 ? `<tr><td>Delivery</td><td style="text-align:right">S/ ${(invoice.deliveryFee || 0).toFixed(2)}</td></tr>` : ''}
    ${!isNV ? `<tr><td>${igvLabel}</td><td style="text-align:right">S/ ${(invoice.igv || 0).toFixed(2)}</td></tr>` : ''}
    <tr><td>TOTAL</td><td style="text-align:right">S/ ${(invoice.orderTotal || 0).toFixed(2)}</td></tr>
  </table>
  <div class="footer">
    <p>${isNV ? 'NOTA DE VENTA — Sin efectos tributarios. Válido solo como comprobante interno.' : (invoice.ruc ? 'Representación impresa de la factura electrónica' : 'Comprobante interno - No válido como factura electrónica')}</p>
    <p>${new Date(invoice.createdAt).toLocaleString('es-PE')}</p>
  </div>
</body></html>`;
  },

  printInvoice(invoice) {
    if (!invoice) return;
    const html = this.getInvoicePrintHtml(invoice);
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  },
};
