import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Image, Tag, MessageSquare, BarChart3, Plus, Edit3, Trash2, X, Save, Loader2, GripVertical, Eye, MousePointerClick,
  Zap, Clock, Sliders, Sparkles, Share2, Send, Heart, BrainCircuit, Instagram, Wifi, Battery,
  ThumbsUp, MessageCircle, Repeat2, ExternalLink, ChevronRight, TrendingUp, Star, Lightbulb,
  Copy, CheckCheck, Globe, SmartphoneNfc, Flame, BadgePercent, LayoutGrid,
  RefreshCw, AlertTriangle, Store,
} from 'lucide-react';
import { marketingService } from '../../lib/marketingService';
import { flashOfferService } from '../../lib/flashOfferService';
import { createPromotion, updatePromotion, deletePromotion, getAllPromotions } from '../../lib/customerPromoService';
import { useToast } from '../../components/ToastContext';
import { ref, set, update, onValue, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { ROUTES } from '../../lib/routes';
import SocialSection from '../components/marketing/SocialSection';

// ── Animated Counter ──
function AnimCounter({ value, decimals = 0, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const st = useRef(null);
  const from = useRef(0);
  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    from.current = display; st.current = null;
    const step = (ts) => {
      if (!st.current) st.current = ts;
      const p = Math.min((ts - st.current) / duration, 1);
      const e = 1 - (1 - p) * (1 - p);
      setDisplay(from.current + (value - from.current) * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);
  return <>{display.toFixed(decimals)}</>;
}

const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function SectionHeader({ label, count, onCreate, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-cm-text-secondary">{label}</p>
          {count !== undefined && <span className="text-xs font-semibold text-cm-text-secondary bg-cm-bg-alt px-2 py-0.5 rounded">{count}</span>}
        </div>
        {onCreate && (
          <button onClick={onCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuevo
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors bg-cm-surface">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function BranchPicker({ branches, selected, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Sucursales</label>
      <div className="flex flex-wrap gap-2">
        {branches.map((b) => {
          const isSelected = selected.includes(b.id);
          return (
            <button key={b.id} type="button" onClick={() => onChange(
              isSelected ? selected.filter((id) => id !== b.id) : [...selected, b.id]
            )}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isSelected
                  ? 'bg-cm-accent text-white border-cm-accent'
                  : 'bg-cm-surface text-cm-text-secondary border-cm-border hover:border-cm-accent'
              }`}>
              {b.name || b.id}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatField({ label, value, onChange, suffix }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <input id={id} type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
        {suffix && <span className="text-sm font-semibold text-cm-text-secondary">{suffix}</span>}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent, animated }) {
  return (
    <motion.div variants={iv} className={`bg-cm-surface border border-cm-border rounded-xl p-4 shadow-cm-sm ${accent ? 'border-cm-accent/30' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${accent ? 'bg-cm-accent/10 text-cm-accent' : 'bg-cm-bg-alt text-cm-text-secondary'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-cm-text-secondary">{label}</span>
      </div>
      <p className="text-xl font-black text-cm-text tabular-nums">{animated ? <AnimCounter value={value} /> : value}</p>
      {sub && <p className="text-[0.6rem] font-semibold text-cm-muted mt-0.5">{sub}</p>}
    </motion.div>
  );
}

const SECTIONS = [
  { key: 'agency_hub', label: '🤖 IA & Redes', icon: Sparkles },
  { key: 'social', label: '📱 Redes Sociales', icon: Share2 },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'campaigns', label: 'Campañas', icon: Megaphone },
  { key: 'banners', label: 'Banners', icon: Image },
  { key: 'promos', label: 'Promos', icon: Tag },
  { key: 'customer_promos', label: 'Promos Clientes', icon: BadgePercent },
  { key: 'testimonials', label: 'Testimonios', icon: MessageSquare },
  { key: 'flash_offers', label: 'Flash Offers', icon: Zap },
  { key: 'kitchen_hours', label: 'Horarios', icon: Clock },
  { key: 'layout_config', label: 'Diseño', icon: Sliders },
  { key: 'stats', label: 'Estadísticas', icon: BarChart3 },
];

const EMPTY_FORM = {
  campaign: { name: '', description: '', type: 'promo', startDate: '', endDate: '', creatives: { heroTitle: '', heroSubtitle: '', ctaText: 'Ver ofertas', ctaLink: ROUTES.HOME } },
  banner: { title: '', subtitle: '', ctaText: '', ctaLink: '', bgColor: '#1a1a2e', textColor: '#ffffff', position: 'hero' },
  promo: { code: '', type: 'percentage', value: '', minOrder: '', maxUses: '', expiresAt: '' },
  testimonial: { author: '', rating: 5, text: '', order: 0 },
  flash_offer: {
    title: '',
    subtitle: '',
    badge: '',
    originalPrice: '',
    flashPrice: '',
    discountPercent: '',
    startTime: '',
    endTime: '',
    items: '',
  },
  stats: { recordTime: 26, freshnessPercent: 100, deliveriesCount: 1240, averageRating: 4.9, totalReviews: 523 },
};

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toISOString().slice(0, 16);
}

// ── Agency Hub: AI copy generator helpers ───────────────────────────────────
const TONES = [
  { value: 'urgency',  label: '🔥 Oferta de Urgencia',   emoji: '🔥' },
  { value: 'discount', label: '💸 Descuento Especial',    emoji: '💸' },
  { value: 'gourmet',  label: '✨ Enfoque Gourmet',       emoji: '✨' },
  { value: 'fun',      label: '🎉 Divertido / Casual',    emoji: '🎉' },
];

const HASHTAG_BANKS = {
  urgency:  ['#AhoraOMásNunca', '#OfertaRelámpago', '#QuedaronPocos', '#NoTePierdasEsto', '#HouseMenuLima'],
  discount: ['#Descuentazo', '#AhorraMás', '#PrecioLoco', '#HouseMenu', '#ComidaDeAutor'],
  gourmet:  ['#GastronomíaPeruana', '#CocinaDeAutor', '#SaborÚnico', '#HouseGourmet', '#ExperienciaGastro'],
  fun:      ['#VivaLaComida', '#AntojoSatisfecho', '#ComedorasFelices', '#HouseFam', '#EsCenaHora'],
};

function generateCopy(product, tone) {
  if (!product) return null;
  const { name, price, description } = product;
  const priceStr = price ? `S/ ${Number(price).toFixed(2)}` : '';
  const desc = description ? description.substring(0, 60) : '';
  const tags = HASHTAG_BANKS[tone] || HASHTAG_BANKS.urgency;
  const tagStr = tags.join(' ');

  const templates = {
    urgency: {
      ig: `🔥 ¡ÚLTIMAS UNIDADES! 🔥\n\n"${name}"${priceStr ? ` a solo ${priceStr}` : ''}\n\n${desc ? `${desc}...` : '¡Un plato que no puedes dejar pasar!'}\n\n⏰ Oferta válida solo por hoy. ¡Pide YA desde nuestra carta digital! 👇\n\n${tagStr} #Urgente #HoyEs`,
      wa: `🔥 *¡ÚLTIMA HORA!* Solo quedan pocos de nuestro *"${name}"*${priceStr ? ` a ${priceStr}` : ''}. ¡Escríbenos antes de que se agoten! 👉 [LINK]`,
    },
    discount: {
      ig: `💸 ¡PRECIO ESPECIAL DE HOY! 💸\n\nNuestro clásico *"${name}"* ${priceStr ? `ahora a ${priceStr}` : 'con descuento especial'}.\n\n${desc ? `${desc}...` : ''}\n\nEscaneá el QR o visita nuestra carta digital. ¡No te lo pierdas! 🎯\n\n${tagStr}`,
      wa: `💸 *¡Oferta exclusiva!* Hoy el *"${name}"* tiene precio especial${priceStr ? `: ${priceStr}` : ''}. ¡Aprovecha ahora! 👇 [LINK]`,
    },
    gourmet: {
      ig: `✨ COCINA DE AUTOR ✨\n\n"${name}" — ${desc ? desc : 'Una experiencia gastronómica que merece ser vivida'}.\n\n${priceStr ? `Desde ${priceStr}` : ''}  |  Ingredientes frescos, sabor único.\n\nReserva tu mesa o pide desde casa. 🍽️\n\n${tagStr}`,
      wa: `✨ Hola! Te recomendamos probar nuestro *"${name}"*. ${desc ? `${desc}.` : ''} ${priceStr ? `Precio: ${priceStr}.` : ''} ¡Hazlo ahora desde nuestra carta! 🍽️`,
    },
    fun: {
      ig: `🎉 ¿Antojo activado? 🎉\n\n"${name}" ${priceStr ? `a ${priceStr}` : ''} y felicidad GARANTIZADA 😍\n\n${desc ? `${desc}...` : ''}\n\nTag a ese amigo que siempre está listo para comer 👇\n\n${tagStr}`,
      wa: `😋 Oye! ¿Ya probaste el *"${name}"* de HOUSE? ${desc ? `${desc}.` : ''} ${priceStr ? `Precio: ${priceStr}.` : ''} ¡Pide ahora y antójate! 🎉 [LINK]`,
    },
  };

  return templates[tone] || templates.urgency;
}

export default function MarketingTab({ activeBranchId, branches }) {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('agency_hub');
  const [campaigns, setCampaigns] = useState([]);
  const [banners, setBanners] = useState([]);
  const [promos, setPromos] = useState([]);
  const [customerPromos, setCustomerPromos] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [flashOffers, setFlashOffers] = useState([]);
  const [kitchenHours, setKitchenHours] = useState([
    { label: 'Almuerzo', open: '11:00', close: '14:30' },
    { label: 'Cena', open: '18:00', close: '21:00' },
  ]);
  const [kitchenHoursSaving, setKitchenHoursSaving] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState({
    landingShowHero: true,
    landingShowFlashOffer: true,
    landingShowStats: true,
    landingShowValues: true,
    landingShowHighlights: true,
    cartaShowHero: false,
    cartaShowFlashOffer: false,
    cartaShowDailyMenu: true,
    cartaShowHighlights: false,
  });
  const [layoutConfigSaving, setLayoutConfigSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM.campaign);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState([activeBranchId]);

  // ── Agency Hub state ───────────────────────────────────────────────────────
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [agSelectedProduct, setAgSelectedProduct] = useState(null);
  const [agTone, setAgTone] = useState('urgency');
  const [agGenerating, setAgGenerating] = useState(false);
  const [agGeneratedCopy, setAgGeneratedCopy] = useState(null);
  const [agIgLikes, setAgIgLikes] = useState(0);
  const [agCopied, setAgCopied] = useState(null);
  const [agSocialFeed, setAgSocialFeed] = useState([]);
  const [agPublishing, setAgPublishing] = useState(false);
  const [agBoosterLoading, setAgBoosterLoading] = useState(null);
  const igLikesIntervalRef = useRef(null);

  // Derived: category names for social scheduling
  const socialCategories = [...new Set(catalogProducts.map((p) => p.category || p.category_name || 'General').filter(Boolean))];

  // ── Cargar catálogo de productos para el Hub de Agencia ───────────────────
  useEffect(() => {
    if (!activeBranchId) return;
    const catalogRef = ref(db, `branches/${activeBranchId}/catalog/products`);
    get(catalogRef).then((snap) => {
      if (!snap.exists()) return;
      const raw = snap.val();
      const allProducts = Object.entries(raw).map(([id, item]) => ({
        id,
        ...item,
        price: item.base_price ?? item.price ?? 0
      }));
      setCatalogProducts(allProducts);
      if (allProducts.length > 0) setAgSelectedProduct(allProducts[0]);
    }).catch(() => {});
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    setError(null);

    let unsubCampaigns, unsubBanners, unsubPromos, unsubTestimonials, unsubStats, unsubFlash, kitchenUnsub, layoutUnsub;
    try {
      unsubCampaigns = marketingService.subscribeCampaigns(activeBranchId, {
      onAdd: (raw) => setCampaigns((prev) => prev.some((c) => c.id === raw.id) ? prev : [...prev, raw]),
      onChange: (raw) => setCampaigns((prev) => prev.map((c) => c.id === raw.id ? { ...c, ...raw } : c)),
      onRemove: (id) => setCampaigns((prev) => prev.filter((c) => c.id !== id)),
    });

    unsubBanners = marketingService.subscribeBanners(activeBranchId, {
      onAdd: (raw) => setBanners((prev) => prev.some((b) => b.id === raw.id) ? prev : [...prev, raw]),
      onChange: (raw) => setBanners((prev) => prev.map((b) => b.id === raw.id ? { ...b, ...raw } : b)),
      onRemove: (id) => setBanners((prev) => prev.filter((b) => b.id !== id)),
    });

    unsubPromos = marketingService.subscribePromos(activeBranchId, {
      onAdd: (raw) => setPromos((prev) => prev.some((p) => p.id === raw.id) ? prev : [...prev, raw]),
      onChange: (raw) => setPromos((prev) => prev.map((p) => p.id === raw.id ? { ...p, ...raw } : p)),
      onRemove: (id) => setPromos((prev) => prev.filter((p) => p.id !== id)),
    });

    unsubTestimonials = marketingService.subscribeTestimonials(activeBranchId, {
      onAdd: (raw) => setTestimonials((prev) => prev.some((t) => t.id === raw.id) ? prev : [...prev, raw]),
      onChange: (raw) => setTestimonials((prev) => prev.map((t) => t.id === raw.id ? { ...t, ...raw } : t)),
      onRemove: (id) => setTestimonials((prev) => prev.filter((t) => t.id !== id)),
    });

    unsubStats = marketingService.subscribeStats(activeBranchId, (data) => {
      setStats(data);
      setLoading(false);
    });

    // Flash Offers
    unsubFlash = flashOfferService.subscribeToActiveFlashOffers(
      activeBranchId,
      (offers) => setFlashOffers(offers ?? []),
    );

    // Horarios de cocina
    kitchenUnsub = onValue(
      ref(db, `branches_config/${activeBranchId}/kitchenHours`),
      (snap) => {
        const val = snap.val();
        if (val) {
          const arr = Array.isArray(val) ? val : Object.values(val);
          if (arr.length > 0) setKitchenHours(arr);
        }
      }
    );

    // Configuración de diseño
    layoutUnsub = onValue(
      ref(db, `branches_config/${activeBranchId}/marketingLayout`),
      (snap) => {
        const val = snap.val();
        if (val) {
          setLayoutConfig((prev) => ({ ...prev, ...val }));
        }
      }
    );

    // Customer promos (global, no branch-specific)
    getAllPromotions().then(setCustomerPromos).catch(() => {});

    setLoading(false);
    } catch (err) {
      setError(err.message || 'Error al cargar datos de marketing');
      setLoading(false);
    }

    return () => {
      unsubCampaigns?.();
      unsubBanners?.();
      unsubPromos?.();
      unsubTestimonials?.();
      unsubStats?.();
      unsubFlash?.();
      kitchenUnsub?.();
      layoutUnsub?.();
      if (igLikesIntervalRef.current) {
        clearInterval(igLikesIntervalRef.current);
      }
    };
  }, [activeBranchId]);

  const openCreate = (section) => {
    setEditing(null);
    const emptyKey = section === 'flash_offers' ? 'flash_offer' : section.replace(/s$/, '');
    setForm({ ...(EMPTY_FORM[emptyKey] ?? EMPTY_FORM.campaign) });
    setSelectedBranchIds([activeBranchId]);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setSelectedBranchIds(item.branchIds?.length > 0 ? [...item.branchIds] : [activeBranchId]);
    const section = activeSection;
    if (section === 'campaigns') {
      setForm({
        name: item.name || '',
        description: item.description || '',
        type: item.type || 'promo',
        startDate: formatDate(item.startDate),
        endDate: formatDate(item.endDate),
        creatives: { ...EMPTY_FORM.campaign.creatives, ...item.creatives },
      });
    } else if (section === 'banners') {
      setForm({
        title: item.title || '',
        subtitle: item.subtitle || '',
        ctaText: item.ctaText || '',
        ctaLink: item.ctaLink || '/',
        bgColor: item.bgColor || '#1a1a2e',
        textColor: item.textColor || '#ffffff',
        position: item.position || 'hero',
      });
    } else if (section === 'promos') {
      setForm({
        code: item.code || '',
        type: item.type || 'percentage',
        value: item.value || '',
        minOrder: item.minOrder || '',
        maxUses: item.maxUses || '',
        expiresAt: formatDate(item.expiresAt),
      });
    } else if (section === 'testimonials') {
      setForm({
        author: item.author || '',
        rating: item.rating || 5,
        text: item.text || '',
        order: item.order ?? 0,
      });
    } else if (section === 'flash_offers') {
      setForm({
        title: item.title || '',
        subtitle: item.subtitle || '',
        badge: item.badge || '',
        originalPrice: item.originalPrice ?? '',
        flashPrice: item.flashPrice ?? item.price ?? '',
        discountPercent: item.discountPercent ?? '',
        startTime: formatDate(item.startTime),
        endTime: formatDate(item.endTime),
        items: Array.isArray(item.items)
          ? item.items.map((i) => (typeof i === 'string' ? i : i.name)).join('\n')
          : '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM[activeSection]);
  };

  const saveToBranches = async (section, data, itemId) => {
    const ids = selectedBranchIds.length > 0 ? selectedBranchIds : [activeBranchId];
    const promises = ids.map((branchId) => {
      if (itemId) {
        const updateMap = {
          campaigns: () => marketingService.updateCampaign(branchId, itemId, data),
          banners: () => marketingService.updateBanner(branchId, itemId, data),
          promos: () => marketingService.updatePromo(branchId, itemId, data),
          testimonials: () => marketingService.updateTestimonial(branchId, itemId, data),
        };
        return updateMap[section]();
      } else {
        const createMap = {
          campaigns: () => marketingService.createCampaign(branchId, data),
          banners: () => marketingService.createBanner(branchId, data),
          promos: () => marketingService.createPromo(branchId, data),
          testimonials: () => marketingService.createTestimonial(branchId, data),
        };
        return createMap[section]();
      }
    });
    await Promise.all(promises);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const section = activeSection;
      let data;

      if (section === 'campaigns') {
        data = {
          name: form.name,
          description: form.description,
          type: form.type,
          startDate: new Date(form.startDate).getTime(),
          endDate: new Date(form.endDate).getTime(),
          isActive: editing?.isActive ?? true,
          branchIds: selectedBranchIds,
          creatives: form.creatives,
          analytics: editing?.analytics || { views: 0, conversions: 0, revenue: 0 },
        };
        await saveToBranches(section, data, editing?.id);
      } else if (section === 'banners') {
        data = {
          title: form.title,
          subtitle: form.subtitle,
          ctaText: form.ctaText || '',
          ctaLink: form.ctaLink || '/',
          bgColor: form.bgColor,
          textColor: form.textColor,
          position: form.position,
          isActive: editing?.isActive ?? true,
          branchIds: selectedBranchIds,
          analytics: editing?.analytics || { views: 0, clicks: 0 },
        };
        await saveToBranches(section, data, editing?.id);
      } else if (section === 'promos') {
        data = {
          code: form.code.toUpperCase().replace(/\s+/g, '_'),
          type: form.type,
          value: Number(form.value),
          minOrder: form.minOrder ? Number(form.minOrder) : null,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          currentUses: editing?.currentUses ?? 0,
          isActive: editing?.isActive ?? true,
          expiresAt: new Date(form.expiresAt).getTime(),
          branchIds: selectedBranchIds,
        };
        await saveToBranches(section, data, editing?.id);
      } else if (section === 'testimonials') {
        data = {
          author: form.author,
          rating: Number(form.rating),
          text: form.text,
          order: Number(form.order),
          isActive: editing?.isActive ?? true,
          branchIds: selectedBranchIds,
        };
        await saveToBranches(section, data, editing?.id);
      } else if (section === 'flash_offers') {
        const items = form.items
          ? form.items.split('\n').map((s) => s.trim()).filter(Boolean).map((name) => ({ name }))
          : [];
        // Enrich items with product data from catalog
        const productIds = form.productIds || [];
        const enrichedItems = items.map((item) => {
          // Try to match by name first
          const match = catalogProducts.find(p => p.name === item.name);
          return match ? { ...item, productId: match.id } : item;
        });
        // Add any selected products not already in items
        productIds.forEach((pid) => {
          if (!enrichedItems.some(i => i.productId === pid)) {
            const p = catalogProducts.find(cp => cp.id === pid);
            if (p) enrichedItems.push({ name: p.name, productId: p.id });
          }
        });
        const offerData = {
          title: form.title,
          subtitle: form.subtitle,
          badge: form.badge,
          originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
          flashPrice: Number(form.flashPrice),
          discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
          startTime: form.startTime ? new Date(form.startTime).getTime() : Date.now(),
          endTime: form.endTime ? new Date(form.endTime).getTime() : Date.now() + 60 * 60 * 1000,
          items: enrichedItems,
          productIds,
          isActive: true,
        };
        if (editing?.id) {
          await flashOfferService.updateFlashOffer(activeBranchId, editing.id, offerData);
        } else {
          await flashOfferService.createFlashOffer(activeBranchId, offerData);
        }
      } else if (section === 'customer_promos') {
        const promoData = {
          title: form.title,
          description: form.description,
          type: form.type || 'bonus_points',
          value: Number(form.value) || 0,
          targetSegment: form.targetSegment || 'all',
          startsAt: form.startsAt || '',
          endsAt: form.endsAt || '',
          terms: form.terms || '',
          imageUrl: form.imageUrl || '',
          branchIds: selectedBranchIds,
          productIds: form.productIds || [],
        };
        if (editing?.id) {
          await updatePromotion(editing.id, promoData);
        } else {
          await createPromotion(promoData);
        }
        await getAllPromotions().then(setCustomerPromos);
      }

      showToast(editing ? 'Actualizado' : 'Creado');
      closeModal();
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (section, item) => {
    if (!confirm('¿Estás seguro de eliminar este elemento?')) return;
    const id = item.id || item;
    setActionLoading(id);
    try {
      if (section === 'flash_offers') {
        await flashOfferService.deleteFlashOffer(activeBranchId, id);
        showToast('Oferta flash eliminada');
      } else {
        const branchIds = item.branchIds?.length > 0 ? item.branchIds : [activeBranchId];
        if (section === 'customer_promos') {
          await deletePromotion(id);
          await getAllPromotions().then(setCustomerPromos);
          showToast('Promoción eliminada');
          setActionLoading(null);
          return;
        }
        const deleteMap = {
          campaigns: marketingService.deleteCampaign,
          banners: marketingService.deleteBanner,
          promos: marketingService.deletePromo,
          testimonials: marketingService.deleteTestimonial,
        };
        const fn = deleteMap[section];
        if (!fn) return;
        await Promise.all(branchIds.map((bid) => fn(bid, id)));
        showToast('Eliminado');
      }
    } catch (err) {
      showToast(err.message || 'Error al eliminar', 'error');
    }
    setActionLoading(null);
  };

  const handleToggleActive = async (section, item) => {
    const next = !item.isActive;
    try {
      if (section === 'campaigns') await marketingService.updateCampaign(activeBranchId, item.id, { isActive: next });
      else if (section === 'banners') await marketingService.updateBanner(activeBranchId, item.id, { isActive: next });
      else if (section === 'promos') await marketingService.updatePromo(activeBranchId, item.id, { isActive: next });
      else if (section === 'testimonials') await marketingService.updateTestimonial(activeBranchId, item.id, { isActive: next });
      else if (section === 'customer_promos') await updatePromotion(item.id, { active: next });
    } catch (err) {
      showToast('Error al cambiar estado', 'error');
    }
  };

  const handleSaveStats = async () => {
    setSaving(true);
    try {
      await marketingService.updateStats(activeBranchId, stats);
      showToast('Estadísticas actualizadas');
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error');
    }
    setSaving(false);
  };

  const updateForm = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // --- Render ---

  const renderSectionNav = () => (
    <motion.nav variants={iv} className="flex gap-2 overflow-x-auto pb-2">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        return (
          <button key={s.key} onClick={() => { setActiveSection(s.key); closeModal(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${activeSection === s.key ? 'bg-cm-accent text-white' : 'text-cm-text-secondary hover:bg-cm-accent/10'}`}>
            <Icon className="w-3.5 h-3.5" /> {s.label}
          </button>
        );
      })}
    </motion.nav>
  );

  const renderModal = () => {
    if (!showModal) return null;
    const section = activeSection;
    const isEditing = !!editing;

    return (
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={closeModal}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-cm-text">{isEditing ? 'Editar' : 'Nueva'} {SECTIONS.find((s) => s.key === section)?.label}</h3>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {section === 'campaigns' && (
                  <>
                    <Field label="Nombre" value={form.name} onChange={(v) => updateForm('name', v)} />
                    <Field label="Descripción" value={form.description} onChange={(v) => updateForm('description', v)} />
                    <SelectField label="Tipo" value={form.type} onChange={(v) => updateForm('type', v)}
                      options={[
                        { value: 'promo', label: 'Promoción' },
                        { value: 'flash_offer', label: 'Flash Offer' },
                        { value: 'seasonal', label: 'Temporada' },
                        { value: 'event', label: 'Evento' },
                      ]} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Inicio" type="datetime-local" value={form.startDate} onChange={(v) => updateForm('startDate', v)} />
                      <Field label="Fin" type="datetime-local" value={form.endDate} onChange={(v) => updateForm('endDate', v)} />
                    </div>
                    {branches?.length > 1 && <BranchPicker branches={branches} selected={selectedBranchIds} onChange={setSelectedBranchIds} />}
                    <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider pt-1">Creativos</p>
                    <Field label="Título Hero" value={form.creatives.heroTitle} onChange={(v) => setForm((p) => ({ ...p, creatives: { ...p.creatives, heroTitle: v } }))} />
                    <Field label="Subtítulo Hero" value={form.creatives.heroSubtitle} onChange={(v) => setForm((p) => ({ ...p, creatives: { ...p.creatives, heroSubtitle: v } }))} />
                    <Field label="CTA Texto" value={form.creatives.ctaText} onChange={(v) => setForm((p) => ({ ...p, creatives: { ...p.creatives, ctaText: v } }))} />
                    <Field label="CTA Link" value={form.creatives.ctaLink} onChange={(v) => setForm((p) => ({ ...p, creatives: { ...p.creatives, ctaLink: v } }))} />
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Productos destacados (opcional)</label>
                      <div className="max-h-32 overflow-y-auto border border-cm-border rounded-lg divide-y divide-cm-border">
                        {catalogProducts.length === 0 ? (
                          <p className="text-xs text-cm-text-tertiary p-3">No hay productos en el catálogo</p>
                        ) : catalogProducts.map((p) => {
                          const ids = form.creatives.featuredProductIds || [];
                          const selected = ids.includes(p.id);
                          return (
                            <label key={p.id} className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer transition-colors text-sm ${selected ? 'bg-cm-accent/5' : 'hover:bg-cm-bg'}`}>
                              <input type="checkbox" checked={selected} onChange={() => {
                                const newIds = selected ? ids.filter(id => id !== p.id) : [...ids, p.id];
                                setForm((prev) => ({ ...prev, creatives: { ...prev.creatives, featuredProductIds: newIds } }));
                              }} className="rounded border-cm-border text-cm-accent focus:ring-cm-accent" />
                              <span className="flex-1 font-semibold text-cm-text">{p.name}</span>
                              <span className="text-xs font-bold text-cm-muted">S/ {Number(p.price || 0).toFixed(2)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {section === 'banners' && (
                  <>
                    <Field label="Título" value={form.title} onChange={(v) => updateForm('title', v)} />
                    <Field label="Subtítulo" value={form.subtitle} onChange={(v) => updateForm('subtitle', v)} />
                    <Field label="CTA Texto" value={form.ctaText} onChange={(v) => updateForm('ctaText', v)} />
                    <Field label="CTA Link" value={form.ctaLink} onChange={(v) => updateForm('ctaLink', v)} />
                    <SelectField label="Posición" value={form.position} onChange={(v) => updateForm('position', v)}
                      options={[
                        { value: 'hero', label: 'Hero' },
                        { value: 'top', label: 'Top' },
                        { value: 'bottom', label: 'Bottom' },
                        { value: 'sidebar', label: 'Sidebar' },
                      ]} />
                    {branches?.length > 1 && <BranchPicker branches={branches} selected={selectedBranchIds} onChange={setSelectedBranchIds} />}
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Color Fondo" type="color" value={form.bgColor} onChange={(v) => updateForm('bgColor', v)} />
                      <Field label="Color Texto" type="color" value={form.textColor} onChange={(v) => updateForm('textColor', v)} />
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-cm-border mt-1" style={{ backgroundColor: form.bgColor, color: form.textColor }}>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{form.title || 'Vista previa'}</p>
                        <p className="text-xs opacity-80">{form.subtitle || 'Subtítulo del banner'}</p>
                      </div>
                      {form.ctaText && <span className="text-xs font-bold px-2 py-1 rounded bg-white/20">{form.ctaText}</span>}
                    </div>
                  </>
                )}

                {section === 'promos' && (
                  <>
                    <Field label="Código" value={form.code} onChange={(v) => updateForm('code', v.toUpperCase().replace(/\s+/g, '_'))} placeholder="BIENVENIDA10" />
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField label="Tipo" value={form.type} onChange={(v) => updateForm('type', v)}
                        options={[
                          { value: 'percentage', label: 'Porcentaje' },
                          { value: 'fixed', label: 'Monto fijo' },
                        ]} />
                      <Field label="Valor" type="number" value={form.value} onChange={(v) => updateForm('value', v)}
                        placeholder={form.type === 'percentage' ? '10' : '5.00'} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Pedido mínimo" type="number" value={form.minOrder} onChange={(v) => updateForm('minOrder', v)} placeholder="0" />
                      <Field label="Usos máx." type="number" value={form.maxUses} onChange={(v) => updateForm('maxUses', v)} placeholder="Sin límite" />
                    </div>
                    <Field label="Expira" type="datetime-local" value={form.expiresAt} onChange={(v) => updateForm('expiresAt', v)} />
                    {branches?.length > 1 && <BranchPicker branches={branches} selected={selectedBranchIds} onChange={setSelectedBranchIds} />}
                  </>
                )}

                {section === 'flash_offers' && (
                  <>
                    <Field label="Título" value={form.title} onChange={(v) => updateForm('title', v)} placeholder="🔥 Almuerzo Completo Express" />
                    <Field label="Subtítulo" value={form.subtitle} onChange={(v) => updateForm('subtitle', v)} placeholder="Menú ejecutivo + bebida + postre" />
                    <Field label="Badge" value={form.badge} onChange={(v) => updateForm('badge', v)} placeholder="Quedan 5 porciones" />
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Precio Original" type="number" value={form.originalPrice} onChange={(v) => updateForm('originalPrice', v)} placeholder="25.00" />
                      <Field label="Precio Flash" type="number" value={form.flashPrice} onChange={(v) => updateForm('flashPrice', v)} placeholder="18.50" />
                      <Field label="% Descuento" type="number" value={form.discountPercent} onChange={(v) => updateForm('discountPercent', v)} placeholder="26" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Inicio" type="datetime-local" value={form.startTime} onChange={(v) => updateForm('startTime', v)} />
                      <Field label="Fin" type="datetime-local" value={form.endTime} onChange={(v) => updateForm('endTime', v)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Productos incluidos</label>
                      <div className="max-h-40 overflow-y-auto border border-cm-border rounded-lg divide-y divide-cm-border">
                        {catalogProducts.length === 0 ? (
                          <p className="text-xs text-cm-text-tertiary p-3">No hay productos en el catálogo</p>
                        ) : catalogProducts.map((p) => {
                          const selected = (form.productIds || []).includes(p.id);
                          return (
                            <label key={p.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm ${selected ? 'bg-cm-accent/5' : 'hover:bg-cm-bg'}`}>
                              <input type="checkbox" checked={selected} onChange={() => {
                                const ids = form.productIds || [];
                                updateForm('productIds', selected ? ids.filter(id => id !== p.id) : [...ids, p.id]);
                              }} className="rounded border-cm-border text-cm-accent focus:ring-cm-accent" />
                              <span className="flex-1 font-semibold text-cm-text">{p.name}</span>
                              <span className="text-xs font-bold text-cm-muted">S/ {Number(p.price || 0).toFixed(2)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Descripción de items (opcional, uno por línea)</label>
                      <textarea
                        value={form.items}
                        onChange={(e) => updateForm('items', e.target.value)}
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors resize-none"
                        rows={3}
                        placeholder={"Lomo Saltado de Lomo Fino\nChicha Morada Clásica\nSuspiro a la Limeña"}
                      />
                    </div>
                  </>
                )}

                {section === 'customer_promos' && (
                  <>
                    <Field label="Título" value={form.title} onChange={(v) => updateForm('title', v)} placeholder="🥳 Bonus de Bienvenida" />
                    <Field label="Descripción" value={form.description} onChange={(v) => updateForm('description', v)} placeholder="Ganá 200 pts extra en tu primer pedido" />
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField label="Tipo" value={form.type} onChange={(v) => updateForm('type', v)}
                        options={[
                          { value: 'bonus_points', label: 'Puntos extra' },
                          { value: 'discount_percent', label: '% Descuento' },
                          { value: 'free_item', label: 'Item gratis' },
                        ]} />
                      <Field label="Valor" type="number" value={form.value} onChange={(v) => updateForm('value', v)}
                        placeholder={form.type === 'bonus_points' ? '200' : form.type === 'discount_percent' ? '15' : '1'} />
                    </div>
                    <SelectField label="Segmento" value={form.targetSegment} onChange={(v) => updateForm('targetSegment', v)}
                      options={[
                        { value: 'all', label: 'Todos los clientes' },
                        { value: 'tier:bronze', label: 'Tier Bronce' },
                        { value: 'tier:silver', label: 'Tier Plata' },
                        { value: 'tier:gold', label: 'Tier Oro' },
                        { value: 'tier:platinum', label: 'Tier Platino' },
                        { value: 'new_customers', label: 'Clientes nuevos' },
                      ]} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Inicio" type="datetime-local" value={form.startsAt} onChange={(v) => updateForm('startsAt', v)} />
                      <Field label="Fin" type="datetime-local" value={form.endsAt} onChange={(v) => updateForm('endsAt', v)} />
                    </div>
                    <Field label="Términos (opcional)" value={form.terms} onChange={(v) => updateForm('terms', v)} placeholder="Válido por 1 pedido por cliente" />
                    <Field label="URL de imagen (opcional)" value={form.imageUrl} onChange={(v) => updateForm('imageUrl', v)} placeholder="https://..." />
                    {branches?.length > 1 && <BranchPicker branches={branches} selected={selectedBranchIds} onChange={setSelectedBranchIds} />}
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Productos aplicables (opcional — vacío = todos)</label>
                      <div className="max-h-32 overflow-y-auto border border-cm-border rounded-lg divide-y divide-cm-border">
                        {catalogProducts.length === 0 ? (
                          <p className="text-xs text-cm-text-tertiary p-3">No hay productos en el catálogo</p>
                        ) : catalogProducts.map((p) => {
                          const ids = form.productIds || [];
                          const selected = ids.includes(p.id);
                          return (
                            <label key={p.id} className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer transition-colors text-sm ${selected ? 'bg-cm-accent/5' : 'hover:bg-cm-bg'}`}>
                              <input type="checkbox" checked={selected} onChange={() => {
                                updateForm('productIds', selected ? ids.filter(id => id !== p.id) : [...ids, p.id]);
                              }} className="rounded border-cm-border text-cm-accent focus:ring-cm-accent" />
                              <span className="flex-1 font-semibold text-cm-text">{p.name}</span>
                              <span className="text-xs font-bold text-cm-muted">S/ {Number(p.price || 0).toFixed(2)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {section === 'testimonials' && (
                  <>
                    <Field label="Autor" value={form.author} onChange={(v) => updateForm('author', v)} placeholder="Ana M." />
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField label="Rating" value={String(form.rating)} onChange={(v) => updateForm('rating', Number(v))}
                        options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: '⭐'.repeat(n) }))} />
                      <Field label="Orden" type="number" value={String(form.order)} onChange={(v) => updateForm('order', Number(v))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Texto</label>
                      <textarea value={form.text} onChange={(e) => updateForm('text', e.target.value)}
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors resize-none"
                        rows={3} placeholder="Excelente comida y servicio!" />
                    </div>
                    {branches?.length > 1 && <BranchPicker branches={branches} selected={selectedBranchIds} onChange={setSelectedBranchIds} />}
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4 mt-4 border-t border-cm-border">
                <button onClick={closeModal}
                  className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderCampaigns = () => (
    <SectionHeader label="Campañas" count={campaigns.length} onCreate={() => openCreate('campaigns')}>
      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border bg-cm-bg-alt">
                <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Vigencia</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Vistas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Conv.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cm-border">
              {campaigns.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-cm-text-secondary">Sin campañas aún</td></tr>
              ) : campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-cm-accent/5 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-cm-text">{c.name}</p>
                    <p className="text-xs text-cm-text-secondary truncate max-w-[200px]">{c.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cm-accent/10 text-cm-accent capitalize">{c.type?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-cm-text-secondary">
                    <p>{new Date(c.startDate).toLocaleDateString()}</p>
                    <p>{new Date(c.endDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-cm-text-secondary">
                    <span className="flex items-center justify-center gap-1"><Eye className="w-3 h-3" />{c.analytics?.views ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-cm-text-secondary">
                    <span className="flex items-center justify-center gap-1"><MousePointerClick className="w-3 h-3" />{c.analytics?.conversions ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggleActive('campaigns', c)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${c.isActive ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'}`}>
                      {c.isActive ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete('campaigns', c)} disabled={actionLoading === c.id}
                        className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors disabled:opacity-50">
                        {actionLoading === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionHeader>
  );

  const renderBanners = () => (
    <SectionHeader label="Banners" count={banners.length} onCreate={() => openCreate('banners')}>
      <div className="grid gap-3">
        {banners.length === 0 ? (
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-8 text-center text-sm text-cm-text-secondary">Sin banners aún</div>
        ) : banners.map((b) => (
          <div key={b.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4 flex items-center gap-4">
            <div className="w-24 h-16 rounded-lg flex items-center justify-center text-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: b.bgColor, color: b.textColor }}>
              <span className="px-1">{b.title || b.position}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-cm-text">{b.title}</p>
                <span className="text-xs text-cm-text-secondary capitalize px-1.5 py-0.5 rounded bg-cm-bg-alt">{b.position}</span>
              </div>
              <p className="text-xs text-cm-text-secondary truncate">{b.subtitle}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-cm-text-secondary">
                <span><Eye className="w-3 h-3 inline mr-0.5" />{b.analytics?.views ?? 0}</span>
                <span><MousePointerClick className="w-3 h-3 inline mr-0.5" />{b.analytics?.clicks ?? 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleToggleActive('banners', b)}
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.isActive ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'}`}>
                {b.isActive ? 'Activo' : 'Inactivo'}
              </button>
              <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete('banners', b)} disabled={actionLoading === b.id}
                className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors disabled:opacity-50">
                {actionLoading === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionHeader>
  );

  const renderPromos = () => (
    <SectionHeader label="Códigos Promocionales" count={promos.length} onCreate={() => openCreate('promos')}>
      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border bg-cm-bg-alt">
                <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Descuento</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Usos</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Pedido Mín.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Expira</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cm-border">
              {promos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-cm-text-secondary">Sin promos aún</td></tr>
              ) : promos.map((p) => {
                const expired = p.expiresAt && p.expiresAt < Date.now();
                const maxedOut = p.maxUses && p.currentUses >= p.maxUses;
                const isUsable = p.isActive && !expired && !maxedOut;
                return (
                  <tr key={p.id} className="hover:bg-cm-accent/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm font-bold text-cm-text bg-cm-bg-alt px-2 py-0.5 rounded">{p.code}</code>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-cm-text">
                      {p.type === 'percentage' ? `${p.value}%` : `S/ ${p.value}`}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-cm-text-secondary">
                      {p.currentUses}{p.maxUses ? ` / ${p.maxUses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-cm-text-secondary">
                      {p.minOrder ? `S/ ${p.minOrder}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-cm-text-secondary">
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expired ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cm-error/10 text-cm-error">Expirado</span>
                      ) : maxedOut ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cm-error/10 text-cm-error">Agotado</span>
                      ) : (
                        <button onClick={() => handleToggleActive('promos', p)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.isActive ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'}`}>
                          {p.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete('promos', p)} disabled={actionLoading === p.id}
                          className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors disabled:opacity-50">
                          {actionLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </SectionHeader>
    );

  const renderTestimonials = () => (
    <SectionHeader label="Testimonios" count={testimonials.length} onCreate={() => openCreate('testimonials')}>
      <div className="grid gap-3">
        {testimonials.length === 0 ? (
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-8 text-center text-sm text-cm-text-secondary">Sin testimonios aún</div>
        ) : [...testimonials].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).map((t) => (
          <div key={t.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-cm-accent/10 flex items-center justify-center text-sm font-bold text-cm-accent flex-shrink-0">
              {t.author.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-cm-text">{t.author}</p>
                <span className="text-xs">{'⭐'.repeat(t.rating)}</span>
                <span className="text-xs text-cm-text-secondary">orden {t.order}</span>
              </div>
              <p className="text-xs text-cm-text-secondary italic">"{t.text}"</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleToggleActive('testimonials', t)}
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.isActive ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'}`}>
                {t.isActive ? 'Activo' : 'Inactivo'}
              </button>
              <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete('testimonials', t)} disabled={actionLoading === t.id}
                className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors disabled:opacity-50">
                {actionLoading === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionHeader>
  );

  const renderStats = () => (
    <SectionHeader label="Estadísticas de Marca">
      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-6">
        {!stats ? (
          <p className="text-sm text-cm-text-secondary text-center py-4">Sin datos de estadísticas. Configura los valores iniciales.</p>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatField label="Tiempo Récord (min)" value={stats?.recordTime ?? 26} onChange={(v) => setStats((p) => ({ ...p, recordTime: Number(v) }))} suffix="min" />
          <StatField label="Calidad Fresca (%)" value={stats?.freshnessPercent ?? 100} onChange={(v) => setStats((p) => ({ ...p, freshnessPercent: Number(v) }))} suffix="%" />
          <StatField label="Entregas Realizadas" value={stats?.deliveriesCount ?? 1240} onChange={(v) => setStats((p) => ({ ...p, deliveriesCount: Number(v) }))} />
          <StatField label="Rating Promedio" value={stats?.averageRating ?? 4.9} onChange={(v) => setStats((p) => ({ ...p, averageRating: Number(v) }))} />
          <StatField label="Total Reviews" value={stats?.totalReviews ?? 523} onChange={(v) => setStats((p) => ({ ...p, totalReviews: Number(v) }))} />
        </div>
        <button onClick={handleSaveStats} disabled={saving}
          className="mt-4 w-full py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Estadísticas
        </button>
      </div>
    </SectionHeader>
  );

  const renderCustomerPromos = () => (
    <SectionHeader label="Promos para Clientes" count={customerPromos.length} onCreate={() => openCreate('customer_promos')}>
      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border bg-cm-bg-alt">
                <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Segmento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Tipo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Valor</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Vigencia</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cm-border">
              {customerPromos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-cm-text-secondary">Sin promos de clientes aún</td></tr>
              ) : customerPromos.map((p) => {
                const expired = p.endsAt && p.endsAt < Date.now();
                const notStarted = p.startsAt && p.startsAt > Date.now();
                return (
                  <tr key={p.id} className="hover:bg-cm-accent/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-cm-text">{p.title}</p>
                      <p className="text-xs text-cm-text-secondary truncate max-w-[200px]">{p.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cm-accent/10 text-cm-accent">
                        {p.targetSegment === 'all' ? 'Todos' : p.targetSegment === 'new_customers' ? 'Nuevos' : p.targetSegment?.replace('tier:', '')?.charAt(0).toUpperCase() + p.targetSegment?.slice(6)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-cm-text-secondary">
                      {p.type === 'bonus_points' ? 'Puntos' : p.type === 'discount_percent' ? '% Desc' : p.type === 'free_item' ? 'Free' : p.type}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-cm-text">
                      {p.type === 'bonus_points' ? `+${p.value} pts` : p.type === 'discount_percent' ? `${p.value}%` : p.value}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-cm-text-secondary">
                      {notStarted ? 'Próximo' : expired ? 'Expirado' : p.endsAt ? new Date(p.endsAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expired ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cm-error/10 text-cm-error">Expirado</span>
                      ) : notStarted ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cm-warning/10 text-cm-warning">Programado</span>
                      ) : (
                        <button onClick={() => handleToggleActive('customer_promos', p)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.active ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'}`}>
                          {p.active ? 'Activo' : 'Inactivo'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => {
                          setEditing(p);
                          setForm({
                            title: p.title || '',
                            description: p.description || '',
                            type: p.type || 'bonus_points',
                            value: p.value || '',
                            targetSegment: p.targetSegment || 'all',
                            startsAt: formatDate(p.startsAt),
                            endsAt: formatDate(p.endsAt),
                            terms: p.terms || '',
                            imageUrl: p.imageUrl || '',
                          });
                          setShowModal(true);
                        }} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete('customer_promos', p)} disabled={actionLoading === p.id}
                          className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors disabled:opacity-50">
                          {actionLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SectionHeader>
  );

  const renderDashboard = () => {
    const totalViews = campaigns.reduce((s, c) => s + (c.analytics?.views || 0), 0);
    const totalConversions = campaigns.reduce((s, c) => s + (c.analytics?.conversions || 0), 0);
    const totalBannerViews = banners.reduce((s, b) => s + (b.analytics?.views || 0), 0);
    const totalBannerClicks = banners.reduce((s, b) => s + (b.analytics?.clicks || 0), 0);
    const totalPromoUses = promos.reduce((s, p) => s + (p.currentUses || 0), 0);
    const convRate = totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(1) : '0.0';
    const activeCampCount = campaigns.filter((c) => c.isActive).length;
    const activeBannerCount = banners.filter((b) => b.isActive).length;
    const activePromoCount = promos.filter((p) => p.isActive).length;

    return (
      <motion.div variants={iv} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={Eye} label="Vistas Campañas" value={totalViews} accent animated />
          <KpiCard icon={MousePointerClick} label="Conversiones" value={totalConversions} sub={`${convRate}% tasa`} accent animated />
          <KpiCard icon={Image} label="Vistas Banners" value={totalBannerViews} animated />
          <KpiCard icon={MousePointerClick} label="Clicks Banners" value={totalBannerClicks} animated />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={Tag} label="Usos Promos" value={totalPromoUses} animated />
          <KpiCard icon={Megaphone} label="Campañas Activas" value={activeCampCount} animated />
          <KpiCard icon={Image} label="Banners Activos" value={activeBannerCount} animated />
          <KpiCard icon={Tag} label="Promos Activas" value={activePromoCount} animated />
        </div>

        {/* Campaign performance table */}
        <div>
          <p className="text-sm font-semibold text-cm-text-secondary mb-2">Rendimiento por Campaña</p>
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cm-border bg-cm-bg-alt">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Campaña</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Vistas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Conv.</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Tasa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cm-border">
                  {campaigns.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-cm-text-secondary">Sin campañas aún</td></tr>
                  ) : campaigns.map((c) => {
                    const rate = c.analytics?.views > 0 ? ((c.analytics.conversions / c.analytics.views) * 100).toFixed(1) : '0.0';
                    const now = Date.now();
                    const isExpired = c.endDate < now;
                    return (
                      <tr key={c.id} className="hover:bg-cm-accent/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-cm-text">{c.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            !c.isActive ? 'bg-cm-error/10 text-cm-error'
                            : isExpired ? 'bg-cm-warning/10 text-cm-warning'
                            : 'bg-cm-success/10 text-cm-success'
                          }`}>
                            {!c.isActive ? 'Inactiva' : isExpired ? 'Expirada' : 'Activa'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-cm-text tabular-nums">{c.analytics?.views ?? 0}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-cm-text tabular-nums">{c.analytics?.conversions ?? 0}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold tabular-nums">{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Promo usage table */}
        <div>
          <p className="text-sm font-semibold text-cm-text-secondary mb-2">Rendimiento por Promo</p>
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cm-border bg-cm-bg-alt">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Código</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Usos</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Límite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cm-border">
                  {promos.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-cm-text-secondary">Sin promos aún</td></tr>
                  ) : promos.map((p) => (
                    <tr key={p.id} className="hover:bg-cm-accent/5 transition-colors">
                      <td className="px-4 py-3"><code className="text-sm font-bold text-cm-text bg-cm-bg-alt px-2 py-0.5 rounded">{p.code}</code></td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-cm-text tabular-nums">{p.currentUses ?? 0}</td>
                      <td className="px-4 py-3 text-center text-sm text-cm-text-secondary">{p.maxUses ?? '∞'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderFlashOffers = () => (
    <SectionHeader label="Flash Offers Activas" count={flashOffers.length} onCreate={() => { setActiveSection('flash_offers'); openCreate('flash_offers'); }}>
      <div className="space-y-3">
        {flashOffers.length === 0 ? (
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-8 text-center">
            <Zap className="w-8 h-8 text-cm-text-secondary mx-auto mb-2 opacity-40" />
            <p className="text-sm text-cm-text-secondary">Sin ofertas flash activas</p>
            <p className="text-xs text-cm-muted mt-1">Crea una oferta relámpago para que aparezca en la landing page</p>
          </div>
        ) : flashOffers.map((offer) => {
          const now = Date.now();
          const isExpired = offer.endTime && offer.endTime < now;
          const timeLeft = offer.endTime ? Math.max(0, Math.floor((offer.endTime - now) / 1000)) : null;
          const formatCountdown = (s) => {
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
          };
          return (
            <div key={offer.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${isExpired ? 'bg-cm-error/10 text-cm-error' : 'bg-red-500/10 text-red-400'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-cm-text">{offer.title}</p>
                  {offer.badge && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{offer.badge}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {offer.originalPrice && <span className="text-xs text-cm-muted line-through">S/ {Number(offer.originalPrice).toFixed(2)}</span>}
                  <span className="text-xs font-bold text-cm-accent">S/ {Number(offer.flashPrice ?? offer.price ?? 0).toFixed(2)}</span>
                  {offer.discountPercent && <span className="text-[10px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">-{offer.discountPercent}%</span>}
                  {timeLeft !== null && !isExpired && (
                    <span className="text-[10px] font-semibold text-cm-muted flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {formatCountdown(timeLeft)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isExpired ? 'bg-cm-error/10 text-cm-error' : 'bg-cm-success/10 text-cm-success'
                }`}>
                  {isExpired ? 'Expirada' : 'Activa'}
                </span>
                <button onClick={() => openEdit(offer)} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete('flash_offers', offer)} disabled={actionLoading === offer.id}
                  className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors disabled:opacity-50">
                  {actionLoading === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </SectionHeader>
  );

  const renderKitchenHours = () => {
    const updateRow = (idx, field, value) => {
      setKitchenHours((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };
    const addRow = () => setKitchenHours((prev) => [...prev, { label: '', open: '00:00', close: '00:00' }]);
    const removeRow = (idx) => setKitchenHours((prev) => prev.filter((_, i) => i !== idx));
    const saveHours = async () => {
      setKitchenHoursSaving(true);
      try {
        await set(ref(db, `branches_config/${activeBranchId}/kitchenHours`), kitchenHours);
        showToast('Horarios guardados');
      } catch (err) {
        showToast(err.message || 'Error al guardar horarios', 'error');
      }
      setKitchenHoursSaving(false);
    };

    return (
      <SectionHeader label="Horarios de Cocina">
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-6 space-y-4">
          <p className="text-xs text-cm-muted">Configura los turnos de cocina que se muestran en la landing page y el banner de cuenta regresiva.</p>
          <div className="space-y-3">
            {kitchenHours.map((row, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateRow(idx, 'label', e.target.value)}
                  placeholder="Almuerzo"
                  className="flex-1 px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={row.open}
                    onChange={(e) => updateRow(idx, 'open', e.target.value)}
                    className="px-2 py-2 border border-cm-border rounded-lg text-sm font-mono text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                  />
                  <span className="text-cm-muted text-xs font-bold">—</span>
                  <input
                    type="time"
                    value={row.close}
                    onChange={(e) => updateRow(idx, 'close', e.target.value)}
                    className="px-2 py-2 border border-cm-border rounded-lg text-sm font-mono text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                  />
                </div>
                <button onClick={() => removeRow(idx)} className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs font-semibold text-cm-accent hover:underline">
            <Plus className="w-3.5 h-3.5" /> Añadir turno
          </button>
          <button onClick={saveHours} disabled={kitchenHoursSaving}
            className="w-full py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {kitchenHoursSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Horarios
          </button>
        </div>
      </SectionHeader>
    );
  };

  const renderLayoutConfig = () => {
    const handleToggle = (key) => {
      setLayoutConfig((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const saveLayoutConfig = async () => {
      setLayoutConfigSaving(true);
      try {
        await set(ref(db, `branches_config/${activeBranchId}/marketingLayout`), layoutConfig);
        showToast('Diseño de página guardado');
      } catch (err) {
        showToast(err.message || 'Error al guardar diseño', 'error');
      }
      setLayoutConfigSaving(false);
    };

    const ToggleRow = ({ label, description, isChecked, onChange }) => (
      <div className="flex items-center justify-between p-3.5 bg-cm-bg/50 border border-cm-border/50 rounded-xl transition-all hover:border-cm-accent/20">
        <div>
          <p className="text-xs font-bold text-cm-text">{label}</p>
          {description && <p className="text-[10px] text-cm-muted mt-0.5">{description}</p>}
        </div>
        <button
          onClick={onChange}
          className={`w-10 h-6 rounded-full p-0.5 transition-colors relative shrink-0 ${isChecked ? 'bg-cm-accent' : 'bg-cm-border'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-cm-surface shadow-sm transition-transform ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>
    );

    return (
      <SectionHeader label="Diseño y Componentes Activos">
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-6 space-y-6">
          <p className="text-xs text-cm-muted leading-relaxed">
            Personaliza qué componentes de marketing están visibles para tus clientes en la página de inicio (Landing Page) y la carta (Menú).
          </p>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-cm-accent border-b border-cm-border/40 pb-2">Página de Inicio (Landing Page — /)</h4>
            <div className="grid gap-2.5">
              <ToggleRow
                label="Banner Hero Principal"
                description="Muestra el eslogan de bienvenida y el contador regresivo de cocina activa."
                isChecked={layoutConfig.landingShowHero}
                onChange={() => handleToggle('landingShowHero')}
              />
              <ToggleRow
                label="Oferta Flash Relámpago"
                description="Muestra la oferta flash activa programada para la hora actual."
                isChecked={layoutConfig.landingShowFlashOffer}
                onChange={() => handleToggle('landingShowFlashOffer')}
              />
              <ToggleRow
                label="Estadísticas de Rendimiento"
                description="Muestra un bloque animado con la valoración media y cantidad de pedidos entregados."
                isChecked={layoutConfig.landingShowStats}
                onChange={() => handleToggle('landingShowStats')}
              />
              <ToggleRow
                label="Valores de la Marca (¿Por qué HOUSE?)"
                description="Muestra los beneficios y garantías clave (Sabor de Autor, En menos de 30min, etc.)."
                isChecked={layoutConfig.landingShowValues}
                onChange={() => handleToggle('landingShowValues')}
              />
              <ToggleRow
                label="Testimonios de Clientes y Garantía de Hierro"
                description="Muestra las reseñas de clientes cargadas y la sección de Garantía Total."
                isChecked={layoutConfig.landingShowHighlights}
                onChange={() => handleToggle('landingShowHighlights')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-cm-accent border-b border-cm-border/40 pb-2">Página de la Carta (Menú Digital — /carta)</h4>
            <div className="grid gap-2.5">
              <ToggleRow
                label="Banner Hero Principal"
                description="Muestra el banner animado en la parte superior del menú (desactivado por defecto para agilizar la carta)."
                isChecked={layoutConfig.cartaShowHero}
                onChange={() => handleToggle('cartaShowHero')}
              />
              <ToggleRow
                label="Recomendación del Día (Menú Diario)"
                description="Muestra el menú del día (menú de almuerzo) en la parte superior."
                isChecked={layoutConfig.cartaShowDailyMenu}
                onChange={() => handleToggle('cartaShowDailyMenu')}
              />
              <ToggleRow
                label="Oferta Flash Relámpago"
                description="Muestra la oferta flash activa directamente dentro del menú."
                isChecked={layoutConfig.cartaShowFlashOffer}
                onChange={() => handleToggle('cartaShowFlashOffer')}
              />
              <ToggleRow
                label="Testimonios de Clientes y Garantía de Hierro"
                description="Muestra la sección de opiniones y la garantía de reembolso en la parte inferior del menú."
                isChecked={layoutConfig.cartaShowHighlights}
                onChange={() => handleToggle('cartaShowHighlights')}
              />
            </div>
          </div>

          <button
            onClick={saveLayoutConfig}
            disabled={layoutConfigSaving}
            className="w-full py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {layoutConfigSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Configuración de Diseño
          </button>
        </div>
      </SectionHeader>
    );
  };

  // ── Agency Hub: generate copy ──────────────────────────────────────────────
  const handleGenerateCopy = () => {
    if (!agSelectedProduct) { showToast('Selecciona un producto primero', 'error'); return; }
    setAgGenerating(true);
    setAgGeneratedCopy(null);
    setAgIgLikes(0);
    if (igLikesIntervalRef.current) clearInterval(igLikesIntervalRef.current);
    setTimeout(() => {
      const copy = generateCopy(agSelectedProduct, agTone);
      setAgGeneratedCopy(copy);
      setAgGenerating(false);
      // Animate likes counter
      let likes = 0;
      const target = Math.floor(Math.random() * 900) + 300;
      igLikesIntervalRef.current = setInterval(() => {
        likes += Math.ceil(target / 40);
        if (likes >= target) { likes = target; clearInterval(igLikesIntervalRef.current); }
        setAgIgLikes(likes);
      }, 40);
    }, 1800);
  };

  const handleCopyCopy = (type, text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setAgCopied(type);
    setTimeout(() => setAgCopied(null), 2000);
    showToast('Copiado al portapapeles ✓');
  };

  const handlePublishToFeed = () => {
    if (!agGeneratedCopy || !agSelectedProduct) { showToast('Genera un copy primero', 'error'); return; }
    setAgPublishing(true);
    setTimeout(() => {
      const post = {
        id: Date.now(),
        product: agSelectedProduct.name,
        tone: TONES.find(t => t.value === agTone)?.label || agTone,
        ig: agGeneratedCopy.ig,
        likes: agIgLikes,
        comments: Math.floor(Math.random() * 80) + 10,
        shares: Math.floor(Math.random() * 30) + 5,
        reach: (Math.floor(Math.random() * 5) + 1) * 1000,
        publishedAt: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
        platforms: ['instagram', 'facebook'],
      };
      setAgSocialFeed(prev => [post, ...prev.slice(0, 9)]);
      setAgPublishing(false);
      showToast('¡Publicado en redes sociales! 🚀');
    }, 2200);
  };

  const handleBoosterCreatePromo = async (suggestion) => {
    setAgBoosterLoading(suggestion.id);
    try {
      const promoData = {
        code: suggestion.promoCode,
        type: 'percentage',
        value: suggestion.discount,
        minOrder: null,
        maxUses: 50,
        currentUses: 0,
        isActive: true,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        branchIds: [activeBranchId],
      };
      await marketingService.createPromo(activeBranchId, promoData);
      showToast(`✅ Cupón ${suggestion.promoCode} creado con éxito`);
    } catch (err) {
      showToast(err.message || 'Error al crear cupón', 'error');
    }
    setAgBoosterLoading(null);
  };

  const handleBoosterCreateFlash = async (suggestion) => {
    setAgBoosterLoading(suggestion.id + '_flash');
    try {
      const offerData = {
        title: `⚡ ${suggestion.product} - Oferta Flash`,
        subtitle: `Aprovecha esta oportunidad por tiempo limitado`,
        badge: `${suggestion.discount}% OFF · 2 horas`,
        originalPrice: suggestion.price || null,
        flashPrice: suggestion.price ? +(suggestion.price * (1 - suggestion.discount / 100)).toFixed(2) : null,
        discountPercent: suggestion.discount,
        startTime: Date.now(),
        endTime: Date.now() + 2 * 60 * 60 * 1000,
        items: [{ name: suggestion.product }],
        isActive: true,
      };
      await flashOfferService.createFlashOffer(activeBranchId, offerData);
      showToast(`⚡ Flash Offer para "${suggestion.product}" lanzada`);
    } catch (err) {
      showToast(err.message || 'Error al crear flash offer', 'error');
    }
    setAgBoosterLoading(null);
  };

  const renderAgencyHub = () => {
    const toneObj = TONES.find(t => t.value === agTone);

    // Smart Booster suggestions — derived from catalog
    const boosterSuggestions = catalogProducts.slice(0, 3).map((p, i) => ({
      id: `b${i}`,
      type: i % 2 === 0 ? 'flash' : 'promo',
      product: p.name,
      price: p.price,
      discount: [15, 20, 25][i % 3],
      promoCode: `BOOST${p.name.replace(/\s+/g, '').toUpperCase().slice(0, 6)}${[15, 20, 25][i % 3]}`,
      reason: i === 0 ? 'Más visto en tu menú esta semana' : i === 1 ? 'Sin promo activa en los últimos 7 días' : 'Precio competitivo — ideal para conversiones',
    }));

    return (
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-6 shadow-xl">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 50%), radial-gradient(circle at 20% 80%, #6366f1 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">HouseAI Agency</h2>
                <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">BETA</span>
              </div>
              <p className="text-sm text-purple-200 mt-0.5">Tu agencia de marketing digital integrada · IA + Redes Sociales</p>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Posts publicados', value: agSocialFeed.length, icon: Share2 },
              { label: 'Alcance estimado', value: agSocialFeed.reduce((a, p) => a + (p.reach || 0), 0).toLocaleString(), icon: TrendingUp },
              { label: 'Engagement total', value: agSocialFeed.reduce((a, p) => a + (p.likes || 0) + (p.comments || 0), 0).toLocaleString(), icon: Heart },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
                <Icon className="w-4 h-4 text-purple-300 mb-1" />
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[10px] text-purple-300">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Generador de Copys ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Left: configurador */}
          <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-cm-text">Generador de Copy con IA</p>
                <p className="text-xs text-cm-text-secondary">Crea contenido optimizado para Instagram y WhatsApp</p>
              </div>
            </div>

            {/* Selector de producto */}
            <div>
              <label className="block text-xs font-bold text-cm-text-secondary mb-2 uppercase tracking-wider">Producto del menú</label>
              <select
                value={agSelectedProduct?.id || ''}
                onChange={(e) => setAgSelectedProduct(catalogProducts.find(p => p.id === e.target.value) || null)}
                className="w-full px-3 py-2.5 border border-cm-border rounded-xl text-sm font-semibold text-cm-text focus:outline-none focus:border-violet-500 transition-colors bg-cm-surface"
              >
                {catalogProducts.length === 0 && <option value="">Sin productos en el catálogo</option>}
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.price ? ` · S/ ${Number(p.price).toFixed(2)}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Selector de tono */}
            <div>
              <label className="block text-xs font-bold text-cm-text-secondary mb-2 uppercase tracking-wider">Tono de campaña</label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setAgTone(t.value)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                      agTone === t.value
                        ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/20'
                        : 'bg-cm-bg-alt text-cm-text-secondary border-cm-border hover:border-violet-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateCopy}
              disabled={agGenerating || !agSelectedProduct}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {agGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generando con IA...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generar Copy con IA</>
              )}
            </button>

            {/* Copys generados */}
            <AnimatePresence>
              {agGenerating && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="h-2 bg-violet-500/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.8, ease: 'easeInOut' }}
                    />
                  </div>
                  <p className="text-xs text-cm-muted text-center">Analizando catálogo y generando contenido...</p>
                </motion.div>
              )}
              {agGeneratedCopy && !agGenerating && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {/* Instagram copy */}
                  <div className="bg-cm-bg-alt border border-cm-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                          <Instagram className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-cm-text">Instagram / Facebook</span>
                      </div>
                      <button
                        onClick={() => handleCopyCopy('ig', agGeneratedCopy.ig)}
                        className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        {agCopied === 'ig' ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {agCopied === 'ig' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-xs text-cm-text whitespace-pre-line leading-relaxed">{agGeneratedCopy.ig}</p>
                  </div>
                  {/* WhatsApp copy */}
                  <div className="bg-cm-bg-alt border border-cm-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center">
                          <SmartphoneNfc className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-cm-text">WhatsApp / Difusión</span>
                      </div>
                      <button
                        onClick={() => handleCopyCopy('wa', agGeneratedCopy.wa)}
                        className="flex items-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300 transition-colors"
                      >
                        {agCopied === 'wa' ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {agCopied === 'wa' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-xs text-cm-text whitespace-pre-line leading-relaxed">{agGeneratedCopy.wa}</p>
                  </div>

                  {/* Publish button */}
                  <button
                    onClick={handlePublishToFeed}
                    disabled={agPublishing}
                    className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {agPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    {agPublishing ? 'Publicando en redes...' : 'Publicar ahora en redes'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Instagram mockup */}
          <div className="flex flex-col items-center">
            <p className="text-xs font-bold text-cm-text-secondary uppercase tracking-wider mb-3">Preview Instagram</p>
            <div className="w-full max-w-xs bg-black rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-zinc-800" style={{ aspectRatio: '9/19' }}>
              {/* Status bar */}
              <div className="flex items-center justify-between px-5 pt-3 pb-1">
                <span className="text-white text-[10px] font-bold">9:41</span>
                <div className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-white" />
                  <Battery className="w-3 h-3 text-white" />
                </div>
              </div>
              {/* IG header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                    <span className="text-white text-[9px] font-black">H</span>
                  </div>
                  <div>
                    <p className="text-white text-[10px] font-bold">housemenu_pe</p>
                    <p className="text-zinc-400 text-[8px]">Lima, Perú</p>
                  </div>
                </div>
                <span className="text-blue-400 text-[10px] font-bold">Seguir</span>
              </div>
              {/* Image area */}
              <div className="w-full bg-gradient-to-br from-violet-900 to-indigo-950 flex items-center justify-center" style={{ height: '45%' }}>
                {agSelectedProduct ? (
                  <div className="text-center px-4">
                    <p className="text-4xl mb-2">{toneObj?.emoji || '✨'}</p>
                    <p className="text-white text-sm font-black leading-tight">{agSelectedProduct.name}</p>
                    {agSelectedProduct.price && (
                      <p className="text-violet-300 text-xs font-bold mt-1">S/ {Number(agSelectedProduct.price).toFixed(2)}</p>
                    )}
                  </div>
                ) : (
                  <LayoutGrid className="w-10 h-10 text-zinc-600" />
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                  <motion.div animate={{ scale: agIgLikes > 0 ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3 }}>
                    <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                  </motion.div>
                  <MessageCircle className="w-5 h-5 text-white" />
                  <Send className="w-5 h-5 text-white" />
                </div>
                <Repeat2 className="w-5 h-5 text-white" />
              </div>
              <div className="px-4">
                <p className="text-white text-[10px] font-bold">{agIgLikes.toLocaleString()} Me gusta</p>
                {agGeneratedCopy && (
                  <p className="text-zinc-300 text-[9px] mt-1 leading-tight line-clamp-3">
                    <span className="text-white font-bold">housemenu_pe </span>
                    {agGeneratedCopy.ig.split('\n')[0]}
                  </p>
                )}
                {!agGeneratedCopy && (
                  <p className="text-zinc-500 text-[9px] mt-1 italic">Genera un copy para previsualizar...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Smart Booster ── */}
        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-cm-text">Smart Booster · Sugerencias de la IA</p>
              <p className="text-xs text-cm-text-secondary">Acciones recomendadas basadas en tu catálogo — se ejecutan con 1 click</p>
            </div>
          </div>

          {boosterSuggestions.length === 0 ? (
            <p className="text-sm text-cm-text-secondary text-center py-6">Añade productos al catálogo para recibir sugerencias</p>
          ) : (
            <div className="grid gap-3">
              {boosterSuggestions.map((s) => (
                <div key={s.id} className="flex items-center gap-4 p-4 bg-cm-bg-alt border border-cm-border rounded-xl hover:border-amber-500/30 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    s.type === 'flash' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                  }`}>
                    {s.type === 'flash' ? <Flame className="w-5 h-5" /> : <BadgePercent className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-cm-text truncate">{s.product}</p>
                    <p className="text-xs text-cm-text-secondary">{s.reason}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {s.type === 'flash' ? (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">⚡ Flash Offer · {s.discount}% OFF · 2h</span>
                      ) : (
                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">🎫 Cupón {s.promoCode} · {s.discount}% OFF</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {s.type === 'flash' ? (
                      <button
                        onClick={() => handleBoosterCreateFlash(s)}
                        disabled={agBoosterLoading === s.id + '_flash'}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                      >
                        {agBoosterLoading === s.id + '_flash' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        Lanzar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBoosterCreatePromo(s)}
                        disabled={agBoosterLoading === s.id}
                        className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                      >
                        {agBoosterLoading === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
                        Crear Cupón
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Social Feed Histórico ── */}
        {agSocialFeed.length > 0 && (
          <div className="bg-cm-surface border border-cm-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Globe className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-cm-text">Feed Social · Historial de Publicaciones</p>
                <p className="text-xs text-cm-text-secondary">Tracking de rendimiento de tus publicaciones recientes</p>
              </div>
            </div>
            <div className="space-y-3">
              {agSocialFeed.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3.5 bg-cm-bg-alt border border-cm-border rounded-xl"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-cm-text truncate">{post.product}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-bold">{post.tone}</span>
                    </div>
                    <p className="text-[10px] text-cm-text-secondary line-clamp-1 mt-0.5">{post.ig.split('\n')[0]}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-cm-muted">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{post.likes.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{post.comments}</span>
                      <span className="flex items-center gap-1"><Share2 className="w-3 h-3 text-green-400" />{post.shares}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-violet-400" />{post.reach.toLocaleString()} alcance</span>
                      <span className="ml-auto text-cm-muted">{post.publishedAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {post.platforms.map(p => (
                      <span key={p} className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        p === 'instagram' ? 'bg-gradient-to-br from-pink-500 to-orange-400' : 'bg-blue-600'
                      }`}>
                        {p === 'instagram' ? <Instagram className="w-2.5 h-2.5 text-white" /> : <Globe className="w-2.5 h-2.5 text-white" />}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderSocial = () => (
    <SocialSection
      activeBranchId={activeBranchId}
      campaigns={campaigns}
      categories={socialCategories}
    />
  );

  const sectionContent = () => {
    const renderInner = () => {
      switch (activeSection) {
        case 'agency_hub': return renderAgencyHub();
        case 'social': return renderSocial();
        case 'dashboard': return renderDashboard();
        case 'campaigns': return renderCampaigns();
        case 'banners': return renderBanners();
        case 'promos': return renderPromos();
        case 'testimonials': return renderTestimonials();
        case 'flash_offers': return renderFlashOffers();
        case 'customer_promos': return renderCustomerPromos();
        case 'kitchen_hours': return renderKitchenHours();
        case 'layout_config': return renderLayoutConfig();
        case 'stats': return renderStats();
        default: return null;
      }
    };
    return <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{renderInner()}</motion.div>;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="w-10 h-10 text-cm-error" />
        <p className="text-sm text-cm-text-secondary text-center">{error}</p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-xs font-bold text-cm-accent hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-cm-accent animate-spin" /></div>;
  }

  if (!activeBranchId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-3">
        <Store className="w-10 h-10 text-cm-muted opacity-40" />
        <p className="text-sm text-cm-text-secondary text-center">Selecciona una sucursal para gestionar marketing</p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={cv} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={iv} className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Marketing</h2>
      </motion.div>
      {renderSectionNav()}
      {sectionContent()}
      {renderModal()}
    </motion.div>
  );
}


