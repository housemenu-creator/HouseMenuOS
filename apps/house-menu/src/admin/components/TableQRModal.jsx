/**
 * TableQRModal — Genera QR codes por mesa para imprimir y poner en cada mesa.
 * El cliente escanea y cae directo al menú con la mesa preseleccionada.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, Printer, X, Loader2, Hash } from 'lucide-react';
import QRCode from 'qrcode';

function QRCard({ tableNumber, baseUrl, branchId }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const url = `${baseUrl}?mesa=${tableNumber}${branchId ? `&branch=${branchId}` : ''}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    setLoading(true);
    QRCode.toCanvas(canvasRef.current, url, {
      width: 180,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    }).then(() => setLoading(false));
  }, [url]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `mesa-${tableNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 border border-cm-border shadow-cm-sm">
      <div className="flex items-center gap-1.5">
        <Hash className="w-4 h-4 text-cm-accent" />
        <span className="text-sm font-black text-cm-text">Mesa {tableNumber}</span>
      </div>
      <div className="relative w-[180px] h-[180px] flex items-center justify-center">
        {loading && <Loader2 className="w-6 h-6 text-cm-text-tertiary animate-spin absolute" />}
        <canvas ref={canvasRef} className={loading ? 'opacity-0' : 'opacity-100'} />
      </div>
      <button onClick={handleDownload}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover transition-colors">
        <Download className="w-3.5 h-3.5" /> Descargar
      </button>
    </div>
  );
}

export default function TableQRModal({ isOpen, onClose, branchId, branchName, tableCount }) {
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Build base URL from current location (strip query params)
    const { protocol, host, pathname } = window.location;
    // pathname is typically /menu-app/ — keep the base path
    const base = `${protocol}//${host}${pathname.replace(/\/+$/, '')}`;
    setBaseUrl(base);
  }, []);

  if (!isOpen) return null;

  const tables = Array.from({ length: tableCount || 0 }, (_, i) => i + 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cm-border">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-cm-accent" />
            <h3 className="text-lg font-bold text-cm-text">QR de Mesas</h3>
            {branchName && <span className="text-xs font-semibold text-cm-text-secondary">— {branchName}</span>}
          </div>
          <button onClick={onClose} className="p-2 text-cm-text-tertiary hover:text-cm-text hover:bg-cm-bg-alt rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tableCount === 0 ? (
            <div className="text-center py-12">
              <QrCode className="w-12 h-12 text-cm-text-tertiary mx-auto mb-3" />
              <p className="text-sm font-bold text-cm-text mb-1">No hay mesas configuradas</p>
              <p className="text-xs text-cm-text-secondary">Configurá la cantidad de mesas en la sucursal primero.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-cm-text-secondary mb-4">
                Escaneando el QR el cliente cae directo al menú con la mesa preseleccionada.
                {baseUrl && <span className="block mt-1 font-mono text-[0.55rem] break-all text-cm-text-tertiary">URL base: {baseUrl}?mesa=N</span>}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {tables.map(n => (
                  <QRCard key={n} tableNumber={n} baseUrl={baseUrl} branchId={branchId} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-cm-border">
          <p className="text-[0.55rem] text-cm-text-tertiary">{tables.length} mesa{tables.length !== 1 ? 's' : ''}</p>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 border border-cm-border text-cm-text text-xs font-bold rounded-lg hover:bg-cm-bg-alt transition-colors">
            <Printer className="w-3.5 h-3.5" /> Imprimir todo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
