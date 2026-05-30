import { useState } from "react";
import { nanoBananaService } from "../../hooks/nanoBananaService";
import { Sparkles, Loader2, Image as ImageIcon, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STYLES = [
  { id: "apple", label: "Apple Clean", prompt: "clean minimalist apple product photography, white studio lighting, high fidelity, 8k" },
  { id: "3d", label: "3D Isometric", prompt: "cute 3d isometric render, clay style, vibrant colors, soft lighting, Octane render" },
  { id: "vibrant", label: "Vibrant", prompt: "ultra vibrant colors, cinematic lighting, dramatic shadows, highly detailed" },
  { id: "cyber", label: "Cyber-Andean", prompt: "cyberpunk andean fusion, neon terracotta, obsidian textures, futuristic aesthetic" },
];

export default function NanoBananaGenerator() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const fullPrompt = `${prompt}, ${selectedStyle.prompt}`;
      const result = await nanoBananaService.generateImage(fullPrompt);
      setImageUrl(result); 
    } catch (err: any) {
      setError(err.message || "Error al generar la imagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 glass rounded-[2rem] border border-cm-border w-full shadow-2xl relative overflow-hidden group">
      {/* Background Accent */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-orange-500/10 transition-all duration-700" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500 shadow-inner">
          <Sparkles size={22} className={loading ? "animate-spin" : ""} />
        </div>
        <div>
          <h3 className="text-lg font-black tracking-tight">NanoBanana <span className="text-orange-500">Pro</span></h3>
          <p className="text-[10px] font-bold text-cm-text-secondary uppercase tracking-[0.2em]">IA Visual Studio</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Style Selector */}
        <div>
          <label className="text-[10px] font-black text-cm-text-secondary uppercase tracking-widest mb-3 block opacity-60">
            Estilo Visual
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={`px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-between ${
                  selectedStyle.id === style.id
                    ? "bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20"
                    : "bg-cm-bg/50 text-cm-text-secondary border-cm-border hover:border-orange-500/30"
                }`}
              >
                {style.label}
                {selectedStyle.id === style.id && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-cm-text-secondary uppercase tracking-widest mb-3 block opacity-60">
            Descripción de la Imagen
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Un ceviche servido en un plato de piedra..."
            className="w-full bg-cm-bg/40 border border-cm-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 min-h-[120px] resize-none font-medium placeholder:opacity-30 transition-all"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-30 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 active:scale-[0.97]"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
          {loading ? "Generando Arte..." : "Crear Obra"}
        </button>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 text-[11px] font-bold text-center leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          {imageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-square rounded-[2rem] overflow-hidden border border-cm-border group mt-4 shadow-2xl"
            >
              <img src={imageUrl} alt="Generated by NanoBanana" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                <button 
                  onClick={() => window.open(imageUrl, '_blank')}
                  className="w-full py-3 bg-white/20 backdrop-blur-xl rounded-xl text-white font-bold text-xs uppercase tracking-widest hover:bg-white/30 transition-all flex items-center justify-center gap-2 border border-white/20"
                >
                  <ImageIcon size={16} />
                  Descargar HD
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
