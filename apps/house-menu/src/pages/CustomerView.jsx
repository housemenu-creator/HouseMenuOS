import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { ShoppingCart, ArrowLeft, UtensilsCrossed, ChevronRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { menuService } from '../lib/menuService';
import { dailyMenuService } from '../lib/dailyMenuService';


import { useAppStore } from '@house/store';
import { useNavigate } from 'react-router-dom';

import MenuCard from '../components/MenuCard';
import { useBranch } from '../context/BranchContext';
import CartDrawer from '../components/CartDrawer';
import DateSelector from '../components/DateSelector';
import KioskMode from '../kds/components/KioskMode';

import HeroBanner from '../customer/components/HeroBanner';
import SearchBar from '../customer/components/SearchBar';
import CategoryRibbon from '../customer/components/CategoryRibbon';
import ProductGrid from '../customer/components/ProductGrid';
import WizardFlow from '../customer/components/WizardFlow';
import FlatProductFlow from '../customer/components/FlatProductFlow';
import OrderConfirmation from '../customer/components/OrderConfirmation';
import BentoDailyMenu from '../customer/components/BentoDailyMenu';

export default function CustomerView() {
  const navigate = useNavigate();
  const { branches, activeBranchId, setActiveBranchId } = useBranch();
  const [kioskEnabled, setKioskEnabled] = useState(false);
  useEffect(() => {
    if (!activeBranchId) return;
    const kioskRef = ref(db, `branches/${activeBranchId}/config/kioskEnabled`);
    const unsub = onValue(kioskRef, (snap) => setKioskEnabled(!!snap.val()));
    return unsub;
  }, [activeBranchId]);

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState({ products: {}, modifiers: {}, variations: {} });
  const [view, setView] = useState('landing');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [wizardSelections, setWizardSelections] = useState({});

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const [dailyMenus, setDailyMenus] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const { cart, addToCart: addStoreCart } = useAppStore();

  const liveProduct = useMemo(() => {
    if (!selectedProduct?.id || !catalog.products) return selectedProduct;
    const found = catalog.products[selectedProduct.id];
    return found ? { id: selectedProduct.id, ...found } : selectedProduct;
  }, [selectedProduct, catalog.products]);

  const flowProduct = useMemo(() => ({
    ...liveProduct,
    steps: (liveProduct?.steps || []).filter(s => s.type !== 'auto'),
  }), [liveProduct]);

  const qtyInCart = useMemo(() => {
    if (!liveProduct?.id) return 0;
    return cart.filter(item => (item.productId || item.id) === liveProduct.id).length;
  }, [cart, liveProduct?.id]);

  const isOutOfStockDetail = liveProduct?.trackStock && (liveProduct?.stock ?? 0) <= qtyInCart;

  const categoriesList = useMemo(() => {
    if (!catalog.products) return ['todos'];
    const cats = new Set();
    Object.values(catalog.products).forEach(p => {
      if (p.available !== false && p.category) cats.add(p.category);
    });
    return ['todos', ...Array.from(cats)];
  }, [catalog.products]);

  const categoryImages = useMemo(() => {
    if (!catalog.products) return {};
    const images = {};
    Object.values(catalog.products).forEach(p => {
      if (p.available !== false && p.category && p.image && !images[p.category]) {
        images[p.category] = p.image;
      }
    });
    return images;
  }, [catalog.products]);

  // All products filtered only by search query (not category — scrollspy handles category nav)
  const filteredProducts = useMemo(() => {
    if (!catalog.products) return [];
    return Object.entries(catalog.products).filter(([_, prod]) => {
      if (prod.available === false) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return prod.name?.toLowerCase().includes(q) ||
             prod.description?.toLowerCase().includes(q) ||
             prod.category?.toLowerCase().includes(q);
    });
  }, [catalog.products, searchQuery]);

  // Scrollspy: scroll to category section
  const handleCategoryClick = useCallback((cat) => {
    if (cat === 'todos') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const sectionId = `cat-section-${cat.toLowerCase().replace(/\s+/g, '-')}`;
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Cart total for FAB
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + (i.price || 0), 0), [cart]);

  const variationsList = useMemo(
    () => Object.entries(catalog.variations || {}).map(([id, data]) => ({ id, ...data })),
    [catalog.variations]
  );
  const modifiersList = useMemo(
    () => Object.entries(catalog.modifiers || {})
      .filter(([_, data]) => data.type !== 'Empaque')
      .map(([id, data]) => ({ id, ...data })),
    [catalog.modifiers]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBranch = params.get('branch');
    if (urlBranch && branches.some(b => b.id === urlBranch)) {
      setActiveBranchId(urlBranch);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const timeoutId = setTimeout(() => setLoading(false), 10000);
    const unsubscribe = menuService.subscribeToCatalog(activeBranchId, (data) => {
      clearTimeout(timeoutId);
      setCatalog(data);
      setLoading(false);
    });
    return () => { unsubscribe(); clearTimeout(timeoutId); };
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = dailyMenuService.subscribeToDailyMenus(activeBranchId, (data) => {
      setDailyMenus(data);
    });
    return unsub;
  }, [activeBranchId]);

  const handleSelectProduct = (id, product) => {
    setSelectedProduct({ id, ...product });
    setSelectedVariation(null);
    setSelectedModifiers([]);
    setCurrentStepIndex(0);
    setWizardSelections({});
    setView('wizard');
  };

  const handleToggleModifier = (modId) => {
    setSelectedModifiers(prev =>
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const handleAddToCart = () => {
    let itemTotal = liveProduct.base_price || 0;
    let details = [];

    if (liveProduct.isWizard) {
      const steps = liveProduct.steps || [];
      steps.forEach(step => {
        if (step.type === 'auto') {
          (step.options || []).forEach(opt => {
            itemTotal += opt.price || 0;
            details.push(`${step.title}: ${opt.name}`);
          });
          return;
        }
        const selection = wizardSelections[step.id];
        if (!selection) return;

        const options = step.options || [];
        if (step.type === 'multiple' && Array.isArray(selection)) {
          selection.forEach(optId => {
            const opt = options.find(o => o.id === optId);
            if (opt) {
              itemTotal += opt.price || 0;
              details.push(`${step.title}: ${opt.name}`);
            }
          });
        } else {
          const opt = options.find(o => o.id === selection);
          if (opt) {
            itemTotal += opt.price || 0;
            details.push(`${step.title}: ${opt.name}`);
          }
        }
      });
    } else {
      if (selectedVariation) {
        const vData = catalog.variations[selectedVariation];
        if (vData) {
          if (vData.adjustPrice) itemTotal += vData.adjustPrice;
          details.push(vData.name);
        }
      }

      selectedModifiers.forEach(modId => {
        const mData = catalog.modifiers[modId];
        if (mData) {
          itemTotal += mData.price || 0;
          details.push(mData.name);
        }
      });
    }

    const newItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      productId: liveProduct.id,
      name: liveProduct.name,
      details,
      price: itemTotal,
      packaging: 0,
      deliveryDate: selectedDate,
      ...(liveProduct.isWizard ? {
        wizardSelections: {
          ...wizardSelections,
          ...Object.fromEntries(
            (liveProduct.steps || [])
              .filter(s => s.type === 'auto')
              .map(s => [s.id, (s.options || []).map(o => o.id)])
          ),
        }
      } : {}),
    };

    addStoreCart(newItem);
    setView('landing');
    setIsCartOpen(true);
  };

  const handleWizardOptionToggle = (stepId, option, isMultiple) => {
    setWizardSelections(prev => {
      const current = prev[stepId];
      if (isMultiple) {
        const arr = Array.isArray(current) ? current : [];
        if (arr.includes(option.id)) {
          return { ...prev, [stepId]: arr.filter(id => id !== option.id) };
        } else {
          return { ...prev, [stepId]: [...arr, option.id] };
        }
      } else {
        return { ...prev, [stepId]: current === option.id ? null : option.id };
      }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-cm-bg flex flex-col items-center justify-center z-50">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <h1 className=" text-2xl mb-8">
            <span className="text-cm-text">HOUSE</span><br/>
            <span className="text-cm-accent text-3xl">ALMUERZOS</span>
          </h1>
          <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <motion.div className="h-full bg-cm-accent" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.2 }} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!loading && (!catalog?.products || Object.keys(catalog.products).length === 0)) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <EmptyState
          icon={UtensilsCrossed}
          title="Menú no disponible"
          description="El menú no está disponible en este momento. Intenta más tarde."
        />
      </div>
    );
  }

  if (kioskEnabled) {
    return <KioskMode />;
  }

  return (
    <div className="transition-all duration-300 flex flex-col min-h-screen">
      <nav className="sticky top-0 z-40 bg-cm-bg/80 backdrop-blur-lg border-b border-cm-accent/20 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="text-[0.8rem] font-black tracking-widest text-cm-accent">HOUSE</div>
          <span className="text-[0.6rem] font-bold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full uppercase tracking-wider">
            {branches.find(b => b.id === activeBranchId)?.name || 'Principal'}
          </span>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2 border-2 border-cm-border hover:border-cm-accent hover:bg-cm-accent/5 rounded-full transition-all text-sm font-bold text-cm-text"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Carrito</span>
          {cart.length > 0 && (
            <span className="bg-cm-accent text-white text-[0.6rem] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-cm-sm">
              {cart.length}
            </span>
          )}
        </button>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-10 pb-24">
        <motion.div key="landing" className="space-y-8">
          <HeroBanner branchName={branches.find(b => b.id === activeBranchId)?.name} />
          <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <BentoDailyMenu 
            menu={dailyMenus[selectedDate]} 
            catalog={catalog} 
            onSelectProduct={handleSelectProduct} 
          />
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <CategoryRibbon categories={categoriesList} selected={'todos'} onSelect={handleCategoryClick} categoryImages={categoryImages} />
          <ProductGrid products={filteredProducts} onSelectProduct={handleSelectProduct} searchQuery={searchQuery} />
        </motion.div>
      </main>

      <AnimatePresence>
        {view === 'wizard' && (
          <motion.div
            key="wizard-overlay"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
            className="fixed inset-0 z-[60] bg-cm-bg flex flex-col"
          >
            <div className="sticky top-0 bg-cm-bg/90 backdrop-blur-md border-b border-cm-accent/10 px-6 py-4 flex items-center z-10">
              <button onClick={() => setView('landing')} className="p-2 -ml-2 hover:bg-cm-accent/10 rounded-full transition-colors mr-3">
                <ArrowLeft className="w-6 h-6 text-cm-text" />
              </button>
              <h2 className="text-lg font-black text-cm-text truncate flex-1">{liveProduct?.name}</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32 max-w-2xl mx-auto w-full">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black text-cm-accent tracking-tight">{liveProduct?.name}</h2>
                {liveProduct?.description && (
                  <p className="text-base text-cm-muted mt-4 max-w-md mx-auto leading-relaxed">{liveProduct.description}</p>
                )}
              </div>

              {liveProduct?.isWizard ? (
                <WizardFlow
                  product={flowProduct}
                  wizardSelections={wizardSelections}
                  onOptionToggle={handleWizardOptionToggle}
                  currentStepIndex={currentStepIndex}
                  onStepChange={setCurrentStepIndex}
                  onComplete={handleAddToCart}
                  isOutOfStock={isOutOfStockDetail}
                  qtyInCart={qtyInCart}
                />
              ) : (
                <FlatProductFlow
                  product={liveProduct}
                  variationsList={variationsList}
                  modifiersList={modifiersList}
                  selectedVariation={selectedVariation}
                  selectedModifiers={selectedModifiers}
                  onSelectVariation={setSelectedVariation}
                  onToggleModifier={handleToggleModifier}
                  onAddToCart={handleAddToCart}
                  isOutOfStock={isOutOfStockDetail}
                  qtyInCart={qtyInCart}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Cart FAB — visible only when cart has items and we're in landing view */}
      <AnimatePresence>
        {cart.length > 0 && view === 'landing' && (
          <motion.button
            key="cart-fab"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 bg-cm-accent text-white rounded-2xl shadow-cm-lg border-2 border-cm-border hover:-translate-y-1 hover:shadow-cm-xl transition-all"
            style={{ maxWidth: 'calc(100vw - 3rem)', minWidth: '260px' }}
          >
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center font-black text-sm shrink-0">
              {cart.length}
            </div>
            <span className="font-black text-sm flex-1 text-left">Ver Carrito</span>
            <span className="font-black text-sm">S/ {cartTotal.toFixed(2)}</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderComplete={(id) => {
          setOrderId(id);
          setOrderComplete(true);
          setIsCartOpen(false);
        }}
      />

      <OrderConfirmation
        open={orderComplete}
        orderId={orderId}
        cartItems={cart}
        branchId={activeBranchId}
        onTrackOrder={(id) => {
          setOrderComplete(false);
          setOrderId('');
          navigate(`/rastreo?id=${id}&branch=${activeBranchId}`);
        }}
        onNewOrder={() => {
          setOrderComplete(false);
          setOrderId('');
          setView('landing');
        }}
      />
    </div>
  );
}
