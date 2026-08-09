import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Download, Palette, Maximize, Eye, Loader2, Check } from 'lucide-react';

const SIZES = [
  { value: 'sm', label: 'Chico', pixels: 150 },
  { value: 'md', label: 'Mediano', pixels: 250 },
  { value: 'lg', label: 'Grande', pixels: 400 },
];

function QrPlaceholder({ url, color, size }) {
  const pixelMap = { sm: 150, md: 250, lg: 400 };
  const px = pixelMap[size] || 250;
  // Generar patrón visual tipo QR (estético, no funcional en demo)
  const cells = 11;
  const cellSize = px / cells;
  const pattern = [];
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const isCorner = (r < 3 && c < 3) || (r < 3 && c > cells - 4) || (r > cells - 4 && c < 3);
      const isOn = isCorner || (r * c + r + c) % 3 === 0 || (r === c) || (r + c === cells - 1);
      if (isOn) pattern.push({ r, c });
    }
  }
  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className="mx-auto">
      <rect width={px} height={px} fill="white" rx={8} />
      {pattern.map(({ r, c }) => (
        <rect key={`${r}-${c}`} x={c * cellSize + 1} y={r * cellSize + 1} width={cellSize - 2} height={cellSize - 2} fill={color} rx={1} />
      ))}
    </svg>
  );
}

export default function QrCodeGenerator({ campaigns = [], onGenerate, qrData, generating }) {
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [color, setColor] = useState('#171717');
  const [size, setSize] = useState('md');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!selectedCampaign) return;
    const campaign = campaigns.find((c) => c.id === selectedCampaign);
    onGenerate(selectedCampaign, campaign?.name || '', color);
  };

  const url = qrData?.url || (selectedCampaign ? `${window.location.origin}/menu?promo=${selectedCampaign}` : '');

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
              Campaña
            </label>
            {campaigns.length === 0 ? (
              <p className="text-xs text-cm-text-tertiary">Creá una campaña primero para generar su QR</p>
            ) : (
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent"
              >
                <option value="">Seleccionar campaña</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
              <Palette className="w-3 h-3 inline mr-1" /> Color
            </label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-cm-border cursor-pointer" />
              <span className="text-xs font-mono text-cm-text-secondary">{color}</span>
            </div>
          </div>

          <div>
            <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
              <Maximize className="w-3 h-3 inline mr-1" /> Tamaño
            </label>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-[0.55rem] font-bold transition-all ${
                    size === s.value ? 'bg-cm-accent text-white' : 'bg-cm-bg text-cm-text-secondary border border-cm-border'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedCampaign || generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cm-accent text-white font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            {generating ? 'Generando...' : 'Generar QR'}
          </button>
        </div>

        {/* QR Preview */}
        <div className="bg-cm-bg border border-cm-border rounded-xl p-6 flex flex-col items-center justify-center gap-3">
          {url ? (
            <>
              <QrPlaceholder url={url} color={color} size={size} />
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cm-bg border border-cm-border text-[0.55rem] font-bold text-cm-text-secondary hover:text-cm-accent transition-colors">
                  {copied ? <Check className="w-3 h-3 text-cm-success" /> : <Eye className="w-3 h-3" />}
                  {copied ? 'Copiado' : 'Copiar URL'}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cm-bg border border-cm-border text-[0.55rem] font-bold text-cm-text-secondary hover:text-cm-accent transition-colors">
                  <Download className="w-3 h-3" /> PNG
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cm-bg border border-cm-border text-[0.55rem] font-bold text-cm-text-secondary hover:text-cm-accent transition-colors">
                  <Download className="w-3 h-3" /> SVG
                </button>
              </div>
              {qrData?.scanCount !== undefined && (
                <p className="text-[0.55rem] text-cm-text-tertiary">{qrData.scanCount} escaneos</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-cm-text-tertiary">
              <QrCode className="w-12 h-12" />
              <p className="text-xs font-semibold">Seleccioná una campaña y generá el QR</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
