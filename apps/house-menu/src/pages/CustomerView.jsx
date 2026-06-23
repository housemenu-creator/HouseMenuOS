import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { ShoppingCart, ArrowLeft, UtensilsCrossed, ChevronRight, ArrowUp } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { menuService } from '../lib/menuService';
import { dailyMenuService } from '../lib/dailyMenuService';
import logo from '../assets/logo.jpg';


import { useAppStore } from '@house/store';
import { useNavigate } from 'react-router-dom';
import { ROUTES, rastreoRoute } from '../lib/routes';

import MenuCard from '../components/MenuCard';
import { useBranch } from '../context/BranchContext';
import CategorySidebar from '../customer/components/CategorySidebar';
import SidebarCart from '../customer/components/SidebarCart';

import SearchBar from '../customer/components/SearchBar';
import CategoryRibbon from '../customer/components/CategoryRibbon';
import ProductGrid from '../customer/components/ProductGrid';
import BentoDailyMenu from '../customer/components/BentoDailyMenu';
import MarketingHighlights from '../customer/components/MarketingHighlights';
import UrgencyBar from '../customer/components/UrgencyBar';
import ProductSkeleton from '../customer/components/ProductSkeleton';
import HeroBanner from '../customer/components/HeroBanner';
import FlashOffer from '../customer/components/FlashOffer';

// ── Lazy-loaded heavy sub-views ──────────────────────────
const CartDrawer = lazy(() => import('../components/CartDrawer'));
const KioskMode = lazy(() => import('../kds/components/KioskMode'));
const WizardFlow = lazy(() => import('../customer/components/WizardFlow'));
const FlatProductFlow = lazy(() => import('../customer/components/FlatProductFlow'));
const OrderConfirmation = lazy(() => import('../customer/components/OrderConfirmation'));

export default function CustomerView() {
  const navigate = useNavigate();
  const { branches, activeBranchId, setActiveBranchId } = useBranch();
  const { cart, addToCart: addStoreCart, updateCartItemQty } = useAppStore();

  const [cartLength, setCartLength] = useState(cart.length);
  const [shouldAnimateCart, setShouldAnimateCart] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (cart.length > cartLength) {
      setShouldAnimateCart(true);
      const timer = setTimeout(() => setShouldAnimateCart(false), 600);
      return () => clearTimeout(timer);
    }
    setCartLength(cart.length);
  }, [cart.length, cartLength]);

  useEffect(() => {
    const handleScrollVisibility = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScrollVisibility);
    return () => window.removeEventListener('scroll', handleScrollVisibility);
  }, []);

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
  const [lastOrderItems, setLastOrderItems] = useState([]);

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const [dailyMenus, setDailyMenus] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
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
    const images = {};
    if (catalog.products) {
      Object.values(catalog.products).forEach(p => {
        if (p.available !== false && p.category && p.image && !images[p.category]) {
          images[p.category] = p.image;
        }
      });
    }
    if (catalog.categories) {
      Object.entries(catalog.categories).forEach(([_, catData]) => {
        if (catData && catData.image && catData.name) {
          images[catData.name] = catData.image;
        }
      });
    }
    return images;
  }, [catalog.products, catalog.categories]);

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

  const [activeCategory, setActiveCategory] = useState('todos');

  // Scrollspy: scroll to category section
  const handleCategoryClick = useCallback((cat) => {
    setActiveCategory(cat);
    if (cat === 'todos') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const sectionId = `cat-section-${cat.toLowerCase().replace(/\s+/g, '-')}`;
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // IntersectionObserver to auto-update activeCategory on scroll
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px',
      threshold: 0,
    };

    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          const categoryKey = sectionId.replace('cat-section-', '');
          const matchedCategory = categoriesList.find(
            (c) => c.toLowerCase().replace(/\s+/g, '-') === categoryKey
          );
          if (matchedCategory) {
            setActiveCategory(matchedCategory);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    categoriesList.forEach((cat) => {
      if (cat === 'todos') return;
      const sectionId = `cat-section-${cat.toLowerCase().replace(/\s+/g, '-')}`;
      const el = document.getElementById(sectionId);
      if (el) observer.observe(el);
    });

    const handleScroll = () => {
      if (window.scrollY < 200) {
        setActiveCategory('todos');
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [categoriesList]);


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

  const [urlMesa, setUrlMesa] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBranch = params.get('branch');
    if (urlBranch && branches.some(b => b.id === urlBranch)) {
      setActiveBranchId(urlBranch);
    }
    const mesaParam = params.get('mesa') || params.get('table');
    if (mesaParam) {
      setUrlMesa(mesaParam);
    }
  }, [branches]);

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

  useEffect(() => {
    if (!activeBranchId) return;
    const layoutRef = ref(db, `branches_config/${activeBranchId}/marketingLayout`);
    const unsub = onValue(layoutRef, (snap) => {
      const val = snap.val();
      if (val) {
        setLayoutConfig((prev) => ({ ...prev, ...val }));
      }
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

  const handleAddToCart = (quantity = 1) => {
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
      price: itemTotal * quantity,
      unitPrice: itemTotal,
      quantity: Number(quantity),
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
      <div className="min-h-screen bg-cm-bg flex flex-col">
        {/* Header Shimmer */}
        <div className="sticky top-0 z-40 bg-cm-bg/85 backdrop-blur-lg border-b border-cm-accent/15 px-6 py-4 flex justify-between items-center animate-pulse">
          <div className="h-5 bg-cm-muted/20 w-24 rounded-full" />
          <div className="h-9 bg-cm-muted/10 w-24 rounded-full" />
        </div>
        
        <div className="max-w-2xl mx-auto w-full px-6 pt-10 pb-24 space-y-8">
          {/* Bento Daily Menu Shimmer */}
          <div className="h-48 bg-cm-surface border border-cm-border rounded-3xl p-6 relative overflow-hidden animate-pulse flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-4 bg-cm-muted/25 w-32 rounded-full" />
              <div className="h-8 bg-cm-muted/25 w-56 rounded-full" />
              <div className="h-4 bg-cm-muted/20 w-3/4 rounded-full" />
            </div>
            <div className="h-8 bg-cm-muted/15 w-36 rounded-full" />
          </div>

          {/* SearchBar Shimmer */}
          <div className="h-12 bg-cm-surface border border-cm-border rounded-xl animate-pulse" />

          {/* Categories Ribbon Shimmer */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-cm-muted/15 w-20 rounded-full shrink-0 animate-pulse" />
            ))}
          </div>

          {/* Product Cards Shimmer */}
          <ProductSkeleton />
        </div>
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
    return <Suspense fallback={<div className="min-h-screen bg-cm-bg flex items-center justify-center"><div className="w-8 h-8 border-4 border-cm-accent border-t-transparent rounded-full animate-spin" /></div>}><KioskMode /></Suspense>;
  }

  return (
    <div className="transition-all duration-300 flex flex-col min-h-screen">
      <UrgencyBar />
      <nav className="sticky top-0 z-40 bg-cm-bg/75 backdrop-blur-md border-b border-cm-border/60 px-6 py-3.5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(ROUTES.HOME)} className="p-1.5 hover:bg-cm-accent/10 rounded-full transition-colors text-cm-text shrink-0" title="Volver al inicio">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="House Logo" className="w-7 h-7 rounded-lg object-cover border border-cm-border shadow-cm-sm" />
            <div className="text-[0.8rem] font-black tracking-widest text-cm-accent">HOUSE</div>
            <span className="text-[0.6rem] font-bold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full uppercase tracking-wider">
              {branches.find(b => b.id === activeBranchId)?.name || 'Principal'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2 border border-cm-border hover:border-cm-accent/40 hover:bg-cm-accent/5 rounded-full transition-all text-xs font-black uppercase tracking-wider text-cm-text"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Carrito</span>
          {cart.length > 0 && (
            <span className="bg-cm-accent text-white text-[0.65rem] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-cm-sm animate-pulse">
              {cart.length}
            </span>
          )}
        </button>
      </nav>

      {/* New 3-Column Layout */}
      <div className="flex min-h-screen bg-cm-bg">
        {/* Left Sidebar - Categories (Desktop) */}
        <aside className="hidden lg:block w-64 sticky top-0 h-screen shrink-0 border-r border-cm-border/40 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-cm-accent mb-4">Categorías</h2>
            <CategorySidebar 
              categories={categoriesList} 
              selected={activeCategory} 
              onSelect={handleCategoryClick} 
            />
          </div>
        </aside>

        {/* Main Content - Products */}
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24">
            <motion.div key="menu" className="space-y-8">
              {layoutConfig.cartaShowHero && (
                <HeroBanner 
                  branchName={branches.find(b => b.id === activeBranchId)?.name}
                />
              )}
              {layoutConfig.cartaShowDailyMenu && (
                <BentoDailyMenu 
                  menu={dailyMenus[selectedDate]} 
                  catalog={catalog} 
                  onSelectProduct={handleSelectProduct} 
                />
              )}
              {layoutConfig.cartaShowFlashOffer && (
                <FlashOffer />
              )}
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
              <CategoryRibbon categories={categoriesList} selected={activeCategory} onSelect={handleCategoryClick} categoryImages={categoryImages} />
              <ProductGrid products={filteredProducts} onSelectProduct={handleSelectProduct} onDirectAdd={(id, prod) => {
                const isWizard = prod.isWizard || (prod.steps && prod.steps.length > 0);
                if (isWizard) {
                  handleSelectProduct(id, prod);
                  return;
                }
                
                // Buscar si ya existe en el carrito un item del mismo producto sin opciones
                const existingItem = cart.find(item => item.productId === id && (!item.details || item.details.length === 0));
                if (existingItem) {
                  updateCartItemQty(existingItem.id, (existingItem.quantity || 1) + 1);
                } else {
                  const newItem = {
                    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    productId: id,
                    name: prod.name,
                    details: [],
                    price: (prod.base_price ?? prod.price ?? 0),
                    unitPrice: (prod.base_price ?? prod.price ?? 0),
                    quantity: 1,
                    packaging: 0,
                    deliveryDate: selectedDate,
                  };
                  addStoreCart(newItem);
                }
              }} searchQuery={searchQuery} />
              {layoutConfig.cartaShowHighlights && (
                <MarketingHighlights />
              )}
            </motion.div>
          </div>
        </main>

        {/* Right Sidebar - Cart (Desktop) */}
        <aside className="hidden lg:block w-80 sticky top-0 h-screen shrink-0 border-l border-cm-border/40 bg-cm-surface/40 backdrop-blur-sm">
          <div className="p-4 h-full">
            <SidebarCart onCheckout={() => setIsCartOpen(true)} />
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {view === 'wizard' && (
          <>
            {/* Backdrop Overlay - solid dark, no blur */}
            <motion.div
              key="wizard-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setView('landing')}
              className="fixed inset-0 z-[55] bg-black/80"
            />

            {/* Centered Modal Container */}
            <motion.div
              key="wizard-overlay"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-4 z-[60] flex flex-col bg-cm-bg rounded-2xl border border-cm-border shadow-cm-lg overflow-hidden sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[85vh]"
            >
              {/* Clean Header */}
              <div className="sticky top-0 bg-cm-bg border-b border-cm-border/40 px-6 py-3 flex items-center z-10 shrink-0">
                <button onClick={() => setView('landing')} className="p-2 -ml-2 hover:bg-cm-accent/10 rounded-full transition-colors mr-3">
                  <ArrowLeft className="w-5 h-5 text-cm-text" />
                </button>
                <h2 className="text-base font-bold text-cm-text truncate flex-1">{liveProduct?.name}</h2>
                <span className="text-xs font-bold text-cm-accent bg-cm-accent/10 px-2.5 py-1 rounded-full border border-cm-accent/20 shrink-0">
                  S/ {(liveProduct?.base_price ?? liveProduct?.price ?? 0).toFixed(2)}
                </span>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 overscroll-contain">
                <div className="max-w-2xl mx-auto w-full">
                  {/* Product Hero - smaller */}
                  {liveProduct?.image && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-cm-border/60 mx-auto mb-4">
                      <img src={liveProduct.image} alt={liveProduct.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h2 className="text-lg font-bold text-cm-text">{liveProduct?.name}</h2>
                    {liveProduct?.description && (
                      <p className="text-xs text-cm-text-secondary mt-1 max-w-md mx-auto leading-relaxed">{liveProduct.description}</p>
                    )}
                  </div>

                  {liveProduct?.isWizard ? (
                    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-3 border-cm-accent border-t-transparent rounded-full animate-spin" /></div>}>
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
                    </Suspense>
                  ) : (
                    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-3 border-cm-accent border-t-transparent rounded-full animate-spin" /></div>}>
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
                    </Suspense>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

          {/* Floating Cart FAB — visible only on mobile when cart has items and we're in landing view */}
          <AnimatePresence>
            {cart.length > 0 && view === 'landing' && (
              <motion.button
                key="cart-fab"
                initial={{ y: 100, opacity: 0 }}
                animate={
                  shouldAnimateCart 
                    ? { scale: [1, 1.08, 0.95, 1.02, 1], y: [0, -12, 2, -3, 0], opacity: 1 } 
                    : { scale: 1, y: 0, opacity: 1 }
                }
                exit={{ y: 100, opacity: 0 }}
                transition={shouldAnimateCart ? { duration: 0.5 } : { type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => setIsCartOpen(true)}
                className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-cm-accent to-amber-500 text-white rounded-2xl shadow-cm-lg hover:-translate-y-0.5 hover:shadow-cm-xl transition-all border border-white/10"
                style={{ maxWidth: 'calc(100vw - 3rem)', minWidth: '260px' }}
              >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-black text-xs shrink-0 relative">
              <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
              <span className="relative z-10">{cart.length}</span>
            </div>
            <span className="font-black text-sm flex-1 text-left tracking-wide">Ver Pedido</span>
            <span className="font-black text-sm">S/ {cartTotal.toFixed(2)}</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && view === 'landing' && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-6 z-40 p-3 bg-cm-surface border-2 border-cm-border text-cm-accent rounded-xl shadow-cm-md hover:border-cm-accent transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>


      <Suspense fallback={null}>
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          initialMesa={urlMesa}
          showMesa={false}
          onOrderComplete={(id, cartSnapshot) => {
            setOrderId(id);
            setLastOrderItems(cartSnapshot || []);
            setOrderComplete(true);
            setIsCartOpen(false);
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <OrderConfirmation
          open={orderComplete}
          orderId={orderId}
          cartItems={lastOrderItems}
          branchId={activeBranchId}
          branchName={branches.find(b => b.id === activeBranchId)?.name}
          mesa={urlMesa}
          onTrackOrder={(id) => {
            setOrderComplete(false);
            setOrderId('');
            navigate(rastreoRoute(id, activeBranchId));
          }}
          onNewOrder={() => {
            setOrderComplete(false);
            setOrderId('');
            setView('landing');
          }}
        />
      </Suspense>
    </div>
  );
}
