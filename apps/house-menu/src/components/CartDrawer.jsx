import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Trash2, ShoppingCart, MapPin, Clock, CheckCircle, AlertTriangle,
  Navigation, User, Phone, Utensils, Coffee, Smartphone, Banknote,
  CreditCard, FileText, ChevronLeft, Package, ChevronDown, ChevronUp,
  ArrowRight, Tag, Heart, Copy, Image, Clock4, Star, Truck,
} from 'lucide-react';
import { useAppStore, appStore } from '@house/store';
import { ordersService } from '../lib/ordersService';
import { deliveryService } from '../lib/deliveryService';
import { geoService } from '../lib/geoService';
import { storageService } from '../lib/storageService';
import { useBranch } from '../context/BranchContext';
import { useMarketing } from '../context/MarketingContext';
import { findOrCreateCustomer, redeemPoints } from '../lib/customerService';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { isEmail, isPhone, isTime, isRequired } from '@house/validation';
import { marketingService } from '../lib/marketingService';
import { getSessionId } from '@house/db';
import { printOrderTicket, printReceipt } from '../lib/printTicket';

/* ───────── Subcomponentes ───────── */

function CartItemsList({ cart, removeFromCart, updateCartItemQty, itemsByDate, formatDateLabel }) {
  const handleUpdateQty = (itemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
    } else {
      updateCartItemQty(itemId, newQty);
    }
  };

  return Object.entries(itemsByDate).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, items]) => (
    <div key={dateStr} className="space-y-3">
      <h4 className="text-xs font-bold text-cm-accent uppercase tracking-widest border-b border-cm-border pb-2 flex items-center gap-2">
        <Clock4 className="w-3.5 h-3.5" /> {formatDateLabel(dateStr)}
      </h4>
      <AnimatePresence>
        {items.map((item, i) => (
          <motion.div key={item.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05 }}
            className="bg-cm-surface rounded-2xl shadow-cm-md border-2 border-cm-border p-4 flex justify-between items-start group hover:border-cm-accent transition-colors">
            <div className="space-y-1.5 flex-1 pr-3">
              <h4 className="text-base font-black text-cm-text group-hover:text-cm-accent transition-colors leading-tight">
                {item.name}
              </h4>
              {item.details?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.details.map((d, dIdx) => (
                    <span key={dIdx} className="text-[0.65rem] font-bold bg-cm-bg px-2 py-0.5 rounded-md text-cm-text-secondary border border-cm-border">{d}</span>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-cm-border">
                <p className="text-cm-accent font-black text-base">S/ {item.price.toFixed(2)}</p>
                
                {/* Micro Quantity Adjuster */}
                <div className="flex items-center gap-1 bg-cm-bg p-1 rounded-xl border border-cm-border shrink-0">
                  <button
                    onClick={() => handleUpdateQty(item.id, (item.quantity || 1) - 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-cm-text-secondary hover:bg-cm-surface hover:text-cm-text transition-all font-bold text-sm"
                    type="button"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-xs font-black text-cm-text tabular-nums">{item.quantity || 1}</span>
                  <button
                    onClick={() => handleUpdateQty(item.id, (item.quantity || 1) + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-cm-text-secondary hover:bg-cm-surface hover:text-cm-text transition-all font-bold text-sm"
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => removeFromCart(item.id)} className="text-cm-text-secondary hover:text-cm-error hover:bg-cm-error/10 rounded-full p-2 transition-all shrink-0">
              <Trash2 className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  ));
}

function DiscountSection({ discountCode, setDiscountCode, discountSuccess, appliedDiscount, removeDiscount, handleApplyDiscount, discountError }) {
  return (
    <div className="space-y-1.5 pt-2">
      <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase flex items-center gap-1"><Tag className="w-3 h-3" /> Cupón de Descuento</label>
      {discountSuccess ? (
        <div className="flex justify-between items-center bg-cm-success/10 border border-cm-success/20 text-cm-success rounded-xl p-3 text-sm font-bold">
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Cupón Aplicado (-{appliedDiscount * 100}%)</span>
          <button onClick={removeDiscount} className="text-cm-success hover:text-cm-success/60"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="text" value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="Ej. HOUSE10"
            className="flex-1 uppercase bg-cm-bg-alt border border-cm-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
          <button onClick={handleApplyDiscount} className="px-4 py-2 bg-cm-surface border border-cm-border rounded-xl text-sm font-bold hover:bg-cm-accent/10 hover:text-cm-accent transition-all">Aplicar</button>
        </div>
      )}
      {discountError && <p className="text-xs text-cm-error font-medium pl-1">{discountError}</p>}
    </div>
  );
}

function PackagingSelector({ packagingItems, packaging, setPackaging, getPackagingQty }) {
  return (
    <div className="border-2 border-cm-border rounded-2xl overflow-hidden bg-white/30 shadow-cm-sm">
      <button onClick={() => {}} className="w-full p-4 flex items-center justify-between text-cm-text cursor-default" type="button">
        <span className="text-xs font-bold flex items-center gap-2"><Package className="w-4 h-4 text-cm-accent" /> Empaques y descartables</span>
      </button>
      <div className="px-4 pb-4 space-y-2">
        {packagingItems.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-cm-bg-alt border border-cm-border rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-cm-text">{item.icon} {item.name} <span className="opacity-70 font-bold">(S/ {item.price.toFixed(2)})</span></span>
            <div className="flex items-center gap-1 bg-cm-bg-alt rounded-lg p-0.5 border border-cm-border">
              <button onClick={() => setPackaging({ ...packaging, [item.id]: Math.max(0, getPackagingQty(item.id) - 1) })}
                className="w-7 h-7 rounded-md flex items-center justify-center text-cm-text-secondary hover:bg-cm-surface hover:text-cm-text transition-colors" type="button">−</button>
              <span className="w-6 text-center text-sm font-bold text-cm-accent">{getPackagingQty(item.id)}</span>
              <button onClick={() => setPackaging({ ...packaging, [item.id]: getPackagingQty(item.id) + 1 })}
                className="w-7 h-7 rounded-md flex items-center justify-center text-cm-text-secondary hover:bg-cm-surface hover:text-cm-text transition-colors" type="button">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderTypeSelector({ orderType, setOrderType, setLocation, setMesa, setDeliveryFeeOverride, setPackaging, showMesa = true }) {
  const types = [
    ...(showMesa ? [{ key: 'mesa', label: 'Mesa', icon: Utensils }] : []),
    { key: 'llevar', label: showMesa ? 'Llevar' : 'Recoger en local', icon: Coffee },
    { key: 'delivery', label: 'Delivery', icon: MapPin },
  ];
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase">1. Tipo de Pedido</label>
      <div className={`grid ${showMesa ? 'grid-cols-3' : 'grid-cols-2'} gap-2 bg-cm-bg-alt p-1.5 rounded-2xl border border-cm-border`}>
        {types.map(type => {
          const Icon = type.icon;
          const isActive = orderType === type.key;
          return (
            <button key={type.key} type="button"
              onClick={() => { setOrderType(type.key); setLocation(''); setMesa(null); setDeliveryFeeOverride(null); if (type.key !== 'mesa') setPackaging({}); }}
              className={`relative py-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${isActive ? 'text-white' : 'text-cm-text-secondary hover:text-cm-text'}`}>
              {isActive && <motion.div layoutId="orderTypeBg" className="absolute inset-0 bg-cm-accent rounded-xl" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10">{type.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentSelector({ paymentMethod, setPaymentMethod }) {
  const methods = [
    { key: 'yape_plin', label: 'Yape/Plin', icon: Smartphone },
    { key: 'efectivo', label: 'Efectivo', icon: Banknote },
    { key: 'pos', label: 'Tarjeta', icon: CreditCard },
    { key: 'contraentrega', label: 'Contraentrega', icon: Truck },
  ];
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase">3. Método de Pago</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {methods.map(method => {
          const Icon = method.icon;
          const isActive = paymentMethod === method.key;
          return (
            <button key={method.key} type="button" onClick={() => setPaymentMethod(method.key)}
              className={`py-3 px-1 rounded-xl text-[0.65rem] font-bold border transition-all flex flex-col items-center gap-1.5 ${
                isActive ? 'bg-cm-accent border-cm-accent text-white' : 'bg-white/50 border-cm-border text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface'
              }`}>
              <Icon className="w-5 h-5" />
              <span>{method.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepYapePlin({
  selectedWallet, setSelectedWallet, yapeNumber, yapeName, yapeQrUrl, plinNumber, plinName,
  operationNumber, setOperationNumber, handleFileUpload, isUploading, voucherUploaded,
  fileName, copiedStatus, handleCopyNumber, submitError, step, setStep, handleConfirmOrder,
  isSubmitting, total,
}) {
  const showRealQr = selectedWallet === 'yape' && yapeQrUrl;

  return (
    <motion.div key="step3" custom={2}
      variants={{ hidden: (d) => ({ x: d > 0 ? 100 : -100, opacity: 0 }), visible: { x: 0, opacity: 1 }, exit: (d) => ({ x: d > 0 ? -100 : 100, opacity: 0 }) }}
      initial="hidden" animate="visible" exit="exit"
      className="absolute inset-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide pb-[200px]">
        <div className="space-y-2 text-center">
          <h4 className="text-sm font-black text-cm-text uppercase tracking-widest">Escanea y Paga</h4>
          <p className="text-xs text-cm-text-secondary">Elige tu billetera digital preferida</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {['yape', 'plin'].map(w => {
              const isYape = w === 'yape';
              return (
                <button key={w} type="button" onClick={() => setSelectedWallet(w)}
                  className={`py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                    selectedWallet === w
                      ? (isYape ? 'bg-purple-500/10 border-purple-500 text-purple-600' : 'bg-cyan-500/10 border-cyan-500 text-cyan-600')
                      : 'bg-cm-surface border-cm-border text-cm-text-secondary hover:border-cm-text'
                  }`}>
                  <span className={`w-5 h-5 rounded-full ${isYape ? 'bg-purple-600' : 'bg-cyan-500'} flex items-center justify-center text-[10px] text-white font-bold`}>{isYape ? 'Y' : 'P'}</span>
                  {isYape ? 'Yape' : 'Plin'}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`p-5 rounded-2xl border-2 text-center space-y-4 shadow-cm-md bg-white/30 ${selectedWallet === 'yape' ? 'border-purple-500/30' : 'border-cyan-500/30'}`}>
          <div className="w-40 h-40 mx-auto bg-cm-surface p-2.5 rounded-xl border border-cm-border shadow-inner flex items-center justify-center relative group">
            {showRealQr ? (
              <img src={yapeQrUrl} alt="QR Yape" className="w-full h-full object-contain" />
            ) : (
              <svg className="w-full h-full text-cm-text" viewBox="0 0 100 100">
                <rect x="0" y="0" width="25" height="25" fill="currentColor" /><rect x="5" y="5" width="15" height="15" fill="#fff" />
                <rect x="75" y="0" width="25" height="25" fill="currentColor" /><rect x="80" y="5" width="15" height="15" fill="#fff" />
                <rect x="0" y="75" width="25" height="25" fill="currentColor" /><rect x="5" y="80" width="15" height="15" fill="#fff" />
                <path d="M 35,5 H 40 V 15 H 35 Z M 45,5 H 55 V 10 H 45 Z M 60,5 H 70 V 20 H 60 Z M 35,20 H 50 V 25 H 35 Z" fill="currentColor" />
                <path d="M 5,35 H 15 V 40 H 5 Z M 20,35 H 25 V 45 H 20 Z M 30,35 H 45 V 40 H 30 Z M 50,35 H 65 V 50 H 50 Z" fill="currentColor" />
                <path d="M 75,35 H 85 V 40 H 75 Z M 90,35 H 95 V 55 H 90 Z M 5,50 H 15 V 60 H 5 Z M 20,50 H 30 V 55 H 20 Z" fill="currentColor" />
                <path d="M 35,55 H 45 V 65 H 35 Z M 60,55 H 70 V 60 H 60 Z M 75,60 H 85 V 70 H 75 Z M 35,70 H 50 V 75 H 35 Z" fill="currentColor" />
                <path d="M 55,75 H 65 V 85 H 55 Z M 70,75 H 75 V 95 H 70 Z M 80,75 H 95 V 80 H 80 Z M 85,85 H 95 V 95 H 85 Z" fill="currentColor" />
              </svg>
            )}
            <div className={`absolute w-10 h-10 rounded-full border-2 border-white flex items-center justify-center font-bold text-white shadow-md group-hover:scale-110 transition-transform ${selectedWallet === 'yape' ? 'bg-purple-600' : 'bg-cyan-500'}`}>
              {selectedWallet === 'yape' ? 'Y' : 'P'}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-cm-text-secondary uppercase font-black tracking-wider">Titular</p>
            <p className="text-base font-black text-cm-text">{selectedWallet === 'yape' ? yapeName : plinName}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-1.5">
            <p className="text-xs text-cm-text-secondary uppercase font-black tracking-wider">Número</p>
            <div className="flex items-center gap-2 bg-cm-bg-alt border border-cm-border rounded-xl px-4 py-2">
              <span className="text-base font-black text-cm-text tracking-wider">{selectedWallet === 'yape' ? yapeNumber : plinNumber}</span>
              <button type="button" onClick={() => handleCopyNumber(selectedWallet === 'yape' ? yapeNumber : plinNumber)}
                className="text-cm-text-secondary hover:text-cm-accent transition-colors">
                {copiedStatus ? <CheckCircle className="w-4 h-4 text-cm-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copiedStatus && <p className="text-[10px] text-cm-success font-bold uppercase tracking-wider">¡Número copiado!</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase block">1. Número de Operación (Mín. 4 dígitos)</label>
          <input type="text" maxLength={12} placeholder="Ej. 182736" value={operationNumber}
            onChange={e => setOperationNumber(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase block">2. Comprobante <span className="text-cm-error">(Obligatorio)</span></label>
          <div className={`relative border-2 border-dashed rounded-2xl p-5 transition-colors bg-white/20 flex flex-col items-center justify-center text-center cursor-pointer ${!voucherUploaded && !isUploading ? 'border-cm-error/50 hover:border-cm-error' : 'border-cm-border hover:border-cm-accent'}`}>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            {isUploading ? (
              <div className="space-y-2 py-2 flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-cm-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-cm-text-secondary font-bold">Subiendo comprobante...</p>
              </div>
            ) : voucherUploaded ? (
              <div className="space-y-1.5 py-2 flex flex-col items-center text-cm-success">
                <CheckCircle className="w-8 h-8" />
                <p className="text-xs font-black uppercase tracking-wider">¡Comprobante cargado!</p>
                <p className="text-[10px] opacity-80 truncate max-w-[250px]">{fileName}</p>
              </div>
            ) : (
              <div className="space-y-1.5 py-2 flex flex-col items-center text-cm-text-secondary">
                <Image className="w-8 h-8 opacity-60" />
                <p className="text-xs font-bold text-cm-text">Seleccionar foto del voucher</p>
                <p className="text-[10px] opacity-75">PNG, JPG hasta 5MB</p>
                <p className="text-[10px] font-bold text-cm-error mt-1">⬆ Necesario para validar el pago</p>
              </div>
            )}
          </div>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 p-3 bg-cm-error/10 border border-cm-error/30 rounded-xl text-sm text-cm-error font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 bg-cm-surface border-t border-cm-border z-30 flex gap-4">
        <button onClick={() => setStep(2)} className="px-6 py-4 rounded-xl border-2 border-cm-border font-bold bg-cm-surface text-cm-text hover:bg-cm-accent/5 transition-all" type="button">
          ATRÁS
        </button>
        <button disabled={operationNumber.trim().length < 4 || !voucherUploaded || isSubmitting}
          className="flex-1 rounded-xl border-2 border-cm-border bg-cm-accent disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleConfirmOrder} type="button">
          <div className="py-4 px-5 flex justify-between items-center text-white font-black tracking-widest text-sm">
            {isSubmitting ? (
              <div className="flex items-center gap-2 text-sm justify-center w-full">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ENVIANDO PEDIDO...
              </div>
            ) : (
              <><span>ENVIAR PEDIDO</span><span className="text-xl">S/ {total.toFixed(2)} <CheckCircle className="w-5 h-5 inline ml-1 opacity-80" /></span></>
            )}
          </div>
        </button>
      </div>
    </motion.div>
  );
}

/* ───────── Subcomponente: Canje de Puntos ───────── */

function PointsSection({ customerAuth, pointsBalance, usePoints, setUsePoints, pointsToRedeem, setPointsToRedeem, maxPointsRedeemable, pointsDiscountAmount, POINTS_RATE }) {
  if (!customerAuth || pointsBalance <= 0) {
    return (
      <div className="bg-white/30 border border-cm-border/60 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-xs text-cm-text-secondary">
          <Star className="w-4 h-4 text-cm-muted" />
          <span>Iniciá sesión en <strong>Mi Cuenta</strong> para acumular puntos y canjear descuentos.</span>
        </div>
      </div>
    );
  }

  const maxIncrement = Math.max(10, Math.floor(maxPointsRedeemable / 10) * 10);
  const increments = [];
  for (let i = 0; i <= maxIncrement; i += 10) {
    increments.push(i);
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/[0.02] border border-amber-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black text-cm-text uppercase tracking-wider">Puntos HOUSE</h3>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-amber-400">{pointsBalance}</span>
          <span className="text-[0.6rem] font-bold text-cm-text-secondary ml-1 uppercase tracking-wider">pts</span>
        </div>
      </div>

      {pointsDiscountAmount > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-cm-text-secondary">Descuento aplicado</span>
          <span className="font-bold text-amber-400">- S/ {pointsDiscountAmount.toFixed(2)}</span>
        </div>
      )}

      {maxPointsRedeemable >= 10 && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usePoints}
              onChange={(e) => {
                setUsePoints(e.target.checked);
                if (!e.target.checked) setPointsToRedeem(0);
                if (e.target.checked && pointsToRedeem === 0) {
                  setPointsToRedeem(Math.min(100, maxPointsRedeemable));
                }
              }}
              className="w-4 h-4 rounded border-cm-border text-amber-500 focus:ring-amber-500/30"
            />
            <span className="text-xs font-bold text-cm-text">Usar puntos para pagar</span>
          </label>

          {usePoints && (
            <div className="space-y-2 pl-6">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={Math.max(10, maxPointsRedeemable)}
                  step={10}
                  value={Math.min(pointsToRedeem, maxPointsRedeemable)}
                  onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-amber-500/20 accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-400 min-w-[4rem] text-right tabular-nums">
                  {Math.min(pointsToRedeem, maxPointsRedeemable)} pts
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-cm-text-secondary">
                <span>10 pts = S/ {(10 / POINTS_RATE).toFixed(2)}</span>
                <span>Máx: {maxPointsRedeemable} pts (S/ {(maxPointsRedeemable / POINTS_RATE).toFixed(2)})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {maxPointsRedeemable < 10 && pointsBalance > 0 && (
        <p className="text-[10px] text-cm-text-secondary">
          Necesitás al menos S/ {(10 / POINTS_RATE / 0.5).toFixed(2)} de pedido para canjear puntos.
        </p>
      )}
    </div>
  );
}

/* ───────── Componente Principal ───────── */

export default function CartDrawer({ isOpen, onClose, onOrderComplete, initialMesa = null, showMesa = true }) {
  const { cart, removeFromCart, clearCart } = useAppStore();
  const { activeBranchId, activeBranch } = useBranch();
  const { validatePromoCode, addLoyaltyPoints, trackPixel } = useMarketing();
  const { isAuthenticated: customerAuth, uid: customerUid, customerProfile: customerAuthProfile } = useCustomerAuth();

  const [step, setStep] = useState(1);
  const [zones, setZones] = useState([]);
  const [customerName, setCustomerName] = useState(() => {
    const saved = localStorage.getItem('cm_customer_name');
    return saved || '';
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    const saved = localStorage.getItem('cm_customer_phone');
    return saved || '';
  });
  const [customerEmail, setCustomerEmail] = useState(() => {
    const saved = localStorage.getItem('cm_customer_email');
    return saved || '';
  });

  // ── Auto-fill from customer auth profile ──
  useEffect(() => {
    if (customerAuth && customerAuthProfile) {
      setCustomerName(prev => prev || customerAuthProfile.name || '');
      setCustomerEmail(prev => prev || customerAuthProfile.email || '');
      setCustomerPhone(prev => prev || customerAuthProfile.phone || '');
    }
  }, [customerAuth, customerAuthProfile]);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [orderType, setOrderType] = useState(initialMesa ? 'mesa' : (showMesa ? 'mesa' : 'llevar'));
  const [paymentMethod, setPaymentMethod] = useState('yape_plin');
  const [observaciones, setObservaciones] = useState('');
  const [mesa, setMesa] = useState(initialMesa);
  const [deliveryFeeOverride, setDeliveryFeeOverride] = useState(null);
  const [packaging, setPackaging] = useState({});
  const [selectedZoneId, setSelectedZoneId] = useState(null);

  const updateCartItemQty = (id, newQuantity) => {
    const updatedCart = cart.map(item => {
      if (item.id === id) {
        const unit = item.unitPrice ?? (item.price / (item.quantity || 1));
        return {
          ...item,
          quantity: newQuantity,
          price: unit * newQuantity,
          unitPrice: unit
        };
      }
      return item;
    });
    appStore.setState({ cart: updatedCart });
  };

  const [tariffConfig, setTariffConfig] = useState(null);
  const [geoLocation, setGeoLocation] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [tipPercentage, setTipPercentage] = useState(0);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountError, setDiscountError] = useState('');
  const [discountSuccess, setDiscountSuccess] = useState(false);
  // ── Points redemption ──
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const POINTS_RATE = 10; // S/1 per 10 points
  const pointsBalance = customerAuth && customerAuthProfile?.points ? customerAuthProfile.points : 0;
  const [operationNumber, setOperationNumber] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('yape');
  const [voucherUploaded, setVoucherUploaded] = useState(false);
  const [voucherUrl, setVoucherUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ── Validation state ──
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [locationError, setLocationError] = useState('');

  const geoTimeout = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef(null);

  // Nominatim autocomplete: debounced search as user types
  useEffect(() => {
    if (orderType !== 'delivery' || !location.trim() || location.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=pe&q=${encodeURIComponent(location.trim())}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'HouseMenuApp/1.0' } });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data || []);
        setShowSuggestions((data || []).length > 0);
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [orderType, location]);

  // Close suggestions on outside click
  useEffect(() => {
    if (orderType !== 'delivery') return;
    const handler = (e) => { if (suggestRef.current && !suggestRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [orderType]);

  const handleSelectSuggestion = (place) => {
    setLocation(place.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    setGeoLocation({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), displayName: place.display_name });
    if (activeBranch?.coordinates?.lat && activeBranch?.coordinates?.lng) {
      setDistanceKm(geoService.calcKm(activeBranch.coordinates.lat, activeBranch.coordinates.lng, parseFloat(place.lat), parseFloat(place.lon)));
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setTipPercentage(0);
        setOperationNumber('');
        setVoucherUploaded(false);
        setVoucherUrl('');
        setFileName('');
        if (initialMesa) {
          setOrderType('mesa');
          setMesa(initialMesa);
        } else {
          setMesa(null);
        }
      }, 300);
    }
  }, [isOpen, initialMesa]);

  useEffect(() => {
    if (initialMesa) {
      setOrderType('mesa');
      setMesa(initialMesa);
    }
  }, [initialMesa]);

  // Clear location error when order type changes (validación cambia)
  useEffect(() => { setLocationError(''); }, [orderType]);

  useEffect(() => { localStorage.setItem('cm_customer_name', customerName); }, [customerName]);
  useEffect(() => { localStorage.setItem('cm_customer_phone', customerPhone); }, [customerPhone]);
  useEffect(() => { localStorage.setItem('cm_customer_email', customerEmail); }, [customerEmail]);

  useEffect(() => { if (!activeBranchId) return; const u = deliveryService.subscribeToZones(activeBranchId, setZones); return () => u(); }, [activeBranchId]);
  useEffect(() => { if (!activeBranchId) return; const u = deliveryService.subscribeToTariffConfig(activeBranchId, setTariffConfig); return () => u(); }, [activeBranchId]);

  const DEFAULT_PACKAGING = [
    { id: 'bottle', name: 'Botella', icon: '🍾', price: 0.50 },
    { id: 'halfL', name: '1/2 Litro', icon: '📦', price: 1.00 },
    { id: 'liter', name: '1 Litro', icon: '📦', price: 1.00 },
  ];
  const packagingItems = activeBranch?.packagingItems || DEFAULT_PACKAGING;
  const getPackagingQty = (id) => packaging[id] || 0;

  useEffect(() => {
    if (orderType !== 'delivery' || !location.trim() || location.trim().length < 5) { setGeoLocation(null); setDistanceKm(null); return; }
    if (geoLocation && geoLocation.displayName === location) return;
    if (geoTimeout.current) clearTimeout(geoTimeout.current);
    geoTimeout.current = setTimeout(async () => {
      setIsGeocoding(true);
      const result = await geoService.geocodeAddress(location);
      if (result && activeBranch?.coordinates?.lat && activeBranch?.coordinates?.lng) {
        setDistanceKm(geoService.calcKm(activeBranch.coordinates.lat, activeBranch.coordinates.lng, result.lat, result.lng));
        setGeoLocation(result);
      }
      setIsGeocoding(false);
    }, 800);
    return () => { if (geoTimeout.current) clearTimeout(geoTimeout.current); };
  }, [location, orderType, activeBranch?.coordinates?.lat, activeBranch?.coordinates?.lng]);

  const handleCopyNumber = (num) => {
    navigator.clipboard.writeText(num);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeBranchId) return;
    setIsUploading(true);
    setFileName(file.name);
    try {
      const result = await storageService.uploadVoucher(activeBranchId, 'pending', file);
      setVoucherUrl(result.url);
      setVoucherUploaded(true);
    } catch (err) {
      console.error('Error uploading voucher:', err);
    }
    setIsUploading(false);
  };

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) return;
    const promo = validatePromoCode(discountCode);
    if (promo) {
      const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
      const ratio = promo.type === 'fixed'
        ? Math.min(promo.value / (subtotal || 1), 1)
        : promo.value / 100;
      setAppliedDiscount(ratio);
      setDiscountSuccess(true);
      setDiscountError('');
      marketingService.incrementPromoUse(activeBranchId, promo.id).catch(() => {});
    } else {
      setAppliedDiscount(0);
      setDiscountSuccess(false);
      setDiscountError('Código inválido o expirado');
    }
  };

  const removeDiscount = () => { setDiscountCode(''); setAppliedDiscount(0); setDiscountSuccess(false); setDiscountError(''); };

  const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
  const discountAmount = subtotal * appliedDiscount;
  const maxPointsRedeemable = Math.min(pointsBalance, Math.floor((subtotal - discountAmount) * POINTS_RATE * 0.5));
  const pointsDiscountAmount = usePoints && pointsToRedeem > 0 ? pointsToRedeem / POINTS_RATE : 0;
  const subtotalWithDiscount = subtotal - discountAmount - pointsDiscountAmount;
  const totalPackaging = packagingItems.reduce((sum, item) => sum + getPackagingQty(item.id) * item.price, 0);

  const yapeNumber = activeBranch?.yapePhone || activeBranch?.phone || '999 888 777';
  const yapeName = activeBranch?.yapeName || activeBranch?.name || 'HOUSE MENU';
  const yapeQrUrl = activeBranch?.yapeQrUrl || '';
  const plinNumber = activeBranch?.plinNumber || activeBranch?.phone || '999 888 777';
  const plinName = activeBranch?.plinName || activeBranch?.name || 'HOUSE MENU';

  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const zoneFee = selectedZone ? selectedZone.fee : 0;
  const zoneFreeThreshold = selectedZone?.freeThreshold ?? activeBranch?.freeThreshold ?? 0;
  const zoneEta = selectedZone?.estimatedMinutes || null;

  const calculatedKmFee = distanceKm != null && tariffConfig ? geoService.calcDeliveryFee(distanceKm, tariffConfig) : null;
  const effectiveDeliveryFee = (orderType === 'delivery' && activeBranch?.deliveryEnabled)
    ? (zoneFreeThreshold > 0 && subtotal >= zoneFreeThreshold ? 0 : (deliveryFeeOverride ?? calculatedKmFee ?? zoneFee > 0 ? zoneFee : activeBranch?.deliveryFee ?? 5))
    : 0;
  const tipAmount = (subtotalWithDiscount * tipPercentage) / 100;
  const total = subtotalWithDiscount + totalPackaging + effectiveDeliveryFee + tipAmount;

  /**
   * Valida campos del formulario y actualiza errores en UI.
   * Retorna true si hay errores, false si todo ok.
   */
  const validateForm = () => {
    let hasErr = false;

    const emailCheck = isEmail(customerEmail);
    setEmailError(emailCheck.valid ? '' : emailCheck.error);
    if (!emailCheck.valid) hasErr = true;

    if (customerPhone.trim()) {
      const phoneCheck = isPhone(customerPhone);
      setPhoneError(phoneCheck.valid ? '' : phoneCheck.error);
      if (!phoneCheck.valid) hasErr = true;
    } else {
      setPhoneError('');
    }

    if (orderType === 'llevar' && location.trim()) {
      const timeCheck = isTime(location);
      setLocationError(timeCheck.valid ? '' : timeCheck.error);
      if (!timeCheck.valid) hasErr = true;
    } else {
      setLocationError('');
    }

    return hasErr;
  };

  const handleConfirmOrder = async () => {
    // ── Basic required fields ──
    if (!customerName?.trim()) return;
    if (orderType === 'mesa' && !mesa && !location.trim()) return;
    if (orderType !== 'mesa' && !location.trim()) return;
    if (!customerPhone.trim()) return;

    // ── Format validations ──
    if (validateForm()) return;

    setSubmitError('');
    setIsSubmitting(true);

    const deliveryDate = cart[0]?.deliveryDate || new Date().toISOString().split('T')[0];
    const foodPackagingTotal = subtotalWithDiscount + totalPackaging;
    const foodPackagingIgvExcluded = foodPackagingTotal / 1.18;
    const PM_LABELS = { yape_plin: 'Yape/Plin', efectivo: 'Efectivo', pos: 'Tarjeta (POS)', pendiente: 'Pendiente', contraentrega: 'Contraentrega' };
    const OT_LABELS = { mesa: 'Mesa', llevar: 'Para Llevar', delivery: 'Delivery' };

    const orderData = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      location: orderType === 'mesa' ? `Mesa ${mesa || location}` : `${orderType === 'llevar' ? 'Recojo: ' : 'Envío: '}${location}`,
      items: cart,
      deliveryDate,
      observaciones: observaciones.slice(0, 200),
      mesa: orderType === 'mesa' ? (mesa ? Number(mesa) : null) : null,
      deliveryFee: Number(effectiveDeliveryFee.toFixed(2)),
      packaging,
      financials: {
        subtotal: Number(foodPackagingIgvExcluded.toFixed(2)),
        tax_igv: Number((foodPackagingTotal - foodPackagingIgvExcluded).toFixed(2)),
        modifiers_total: 0,
        packaging_total: totalPackaging,
        discount_total: discountAmount,
        points_redeemed: usePoints ? pointsToRedeem : 0,
        points_discount: Number(pointsDiscountAmount.toFixed(2)),
        tip_total: Number(tipAmount.toFixed(2)),
        deliveryFee: Number(effectiveDeliveryFee.toFixed(2)),
        total: Number(total.toFixed(2)),
      },
      payment_method: PM_LABELS[paymentMethod] || 'Pendiente',
      payment_status: paymentMethod === 'yape_plin' ? 'por_verificar' : (paymentMethod === 'pendiente' ? 'pendiente' : (paymentMethod === 'contraentrega' ? 'contraentrega' : 'pagado')),
      payment_details: paymentMethod === 'yape_plin' ? { operation_number: operationNumber.trim(), wallet_type: selectedWallet, voucher_uploaded: !!voucherUploaded, voucher_url: voucherUrl || null } : null,
      order_type: OT_LABELS[orderType] || 'Mesa',
      type: OT_LABELS[orderType] || 'Mesa',
      sessionId: getSessionId(),
    };

    let result;
    try {
      // Escribe el pedido directo a RTDB — el API /api/orders no existe en producción
      result = await ordersService.createOrder(activeBranchId, orderData, customerEmail || null);
    } catch (err) {
      console.error("Error al enviar pedido:", err);
      setIsSubmitting(false);
      setSubmitError('Error de conexión. Verifica tu internet e intenta nuevamente.');
      return;
    }
    setIsSubmitting(false);
    if (result.success) {
      // CRM post-order — atomic points + stats
      try {
        const pointsEarned = Math.floor(total / 10);
        const customer = await findOrCreateCustomer({
          uid: customerUid || undefined,
          email: customerEmail.trim(),
          phone: customerPhone.trim(),
          name: customerName.trim(),
          branchId: activeBranchId,
          orderTotal: total,
          pointsEarned,
        });
        // Deduct redeemed points if any
        if (usePoints && pointsToRedeem > 0 && customer?.id) {
          await redeemPoints(customer.id, pointsToRedeem);
        }
      } catch (crmErr) {
        console.warn("CRM post-order skipped:", crmErr);
      }
      trackPixel('Purchase', { value: total, currency: 'PEN' });

      // ── Print tickets ──
      orderData.id = result.orderId;
      printOrderTicket(orderData, activeBranch?.name || activeBranchId)
        .then(r => {
          if (r.engine) console.log('Comanda impresa:', r.bytes, 'bytes');
          else if (!r.success) console.warn('Print engine no disponible:', r.error);
        });
      if (paymentMethod !== 'yape_plin') {
        printReceipt(orderData, activeBranch?.name || activeBranchId)
          .then(r => {
            if (r.engine) console.log('Boleta impresa:', r.bytes, 'bytes');
          });
      }

      // Save snapshot BEFORE clearing cart (OrderConfirmation needs the items)
      const cartSnapshot = [...cart];
      onOrderComplete(result.orderId, cartSnapshot, paymentMethod);
      clearCart(); setLocation(''); setObservaciones(''); setMesa(initialMesa || null); setDeliveryFeeOverride(null);
      setPackaging({}); setSelectedZoneId(null); setSubmitError(''); setStep(1);
      setOperationNumber(''); setVoucherUploaded(false); setVoucherUrl(''); setFileName(''); removeDiscount(); setTipPercentage(0);
    } else if (result.error === 'stock_insufficient') {
      setSubmitError(`⚠️ ${result.message || 'Uno o más platos se acaban de agotar.'}`);
    } else {
      setSubmitError('Error al procesar el pedido. Intenta nuevamente.');
    }
  };

  const itemsByDate = cart.reduce((acc, item) => {
    const dateStr = item.deliveryDate || new Date().toISOString().split('T')[0];
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return new Date().toDateString() === date.toDateString() ? 'Para Hoy' : `Para el ${date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric' })}`;
  };

  const animVariants = {
    hidden: (d) => ({ x: d > 0 ? 100 : -100, opacity: 0 }),
    visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } },
    exit: (d) => ({ x: d > 0 ? -100 : 100, opacity: 0, transition: { duration: 0.2 } }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50]" />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-cm-bg backdrop-blur-2xl border-l border-cm-border z-[60] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-cm-border flex justify-between items-center bg-cm-surface flex-shrink-0 relative z-20">
              {step === 2 ? (
                <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-cm-text-secondary hover:text-cm-text transition-colors text-sm font-bold" type="button">
                  <ChevronLeft className="w-5 h-5" /> Volver al Resumen
                </button>
              ) : step === 3 ? (
                <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-cm-text-secondary hover:text-cm-text transition-colors text-sm font-bold" type="button">
                  <ChevronLeft className="w-5 h-5" /> Volver a Datos y Pago
                </button>
              ) : (
                <h3 className="text-xl font-black tracking-tight text-cm-text flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-cm-accent" /> CARRITO
                </h3>
              )}
              <button onClick={onClose} className="p-2 hover:bg-cm-accent/10 rounded-full transition-colors text-cm-text-secondary hover:text-cm-text">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence initial={false} custom={step} mode="wait">
                {/* ─── STEP 1: RESUMEN ─── */}
                {step === 1 && (
                  <motion.div key="step1" custom={-1} variants={animVariants} initial="hidden" animate="visible" exit="exit"
                    className="absolute inset-0 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide pb-40">
                      {cart.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-cm-muted space-y-5">
                          <div className="w-24 h-24 rounded-full bg-cm-surface flex items-center justify-center border border-cm-border">
                            <ShoppingCart className="w-12 h-12 text-cm-text-secondary opacity-50" />
                          </div>
                          <div className="text-center space-y-1">
                            <h3 className="text-lg font-black text-cm-text">Tu carrito está vacío</h3>
                            <p className="text-sm font-medium text-cm-text-secondary">Parece que aún no has elegido tu comida.</p>
                          </div>
                          <button onClick={onClose} className="mt-4 px-6 py-3 bg-cm-accent/20 text-cm-accent hover:bg-cm-accent hover:text-white border border-cm-accent/30 rounded-full text-sm font-bold transition-all">
                            Explorar el Menú
                          </button>
                        </motion.div>
                      ) : (
                        <>
                          {zoneFreeThreshold > 0 && (
                            <div className="bg-cm-surface border-2 border-cm-border rounded-2xl p-4 space-y-2 mb-4 shadow-cm-sm">
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-cm-text-secondary">
                                  {subtotal >= zoneFreeThreshold 
                                    ? "🎉 ¡Felicidades! Tienes Delivery GRATIS"
                                    : `Te faltan S/ ${(zoneFreeThreshold - subtotal).toFixed(2)} para Delivery GRATIS`
                                  }
                                </span>
                                <span className="text-cm-accent">{subtotal >= zoneFreeThreshold ? '100%' : `${Math.min((subtotal / zoneFreeThreshold) * 100, 100).toFixed(0)}%`}</span>
                              </div>
                              <div className="h-2 w-full bg-cm-bg-alt rounded-full overflow-hidden border border-cm-border">
                                <div 
                                  className="h-full bg-gradient-to-r from-cm-accent to-orange-500 transition-all duration-500 ease-out"
                                  style={{ width: `${Math.min((subtotal / zoneFreeThreshold) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <CartItemsList cart={cart} removeFromCart={removeFromCart} updateCartItemQty={updateCartItemQty} itemsByDate={itemsByDate} formatDateLabel={formatDateLabel} />
                          <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> Observaciones</label>
                            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value.slice(0, 200))}
                              placeholder="Notas opcionales (ej. sin sal, bien cocido)..."
                              rows={2} maxLength={200}
                              className="w-full bg-cm-bg-alt border border-cm-border rounded-xl p-3 text-sm focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary resize-none" />
                          </div>
                          <DiscountSection discountCode={discountCode} setDiscountCode={setDiscountCode} discountSuccess={discountSuccess} appliedDiscount={appliedDiscount} removeDiscount={removeDiscount} handleApplyDiscount={handleApplyDiscount} discountError={discountError} />
                        </>
                      )}
                    </div>
                    {cart.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 p-5 bg-cm-surface border-t border-cm-border">
                        <div className="flex flex-col gap-1 mb-4">
                          {discountAmount > 0 && <div className="flex justify-between items-center text-xs font-bold text-cm-success"><span>Descuento</span><span>- S/ {discountAmount.toFixed(2)}</span></div>}
                          <div className="flex justify-between items-end">
                            <span className="text-sm font-black text-cm-text-secondary uppercase tracking-widest">Subtotal</span>
                            <span className="text-3xl font-black text-cm-text tracking-tighter">
                              <span className="text-cm-accent text-xl mr-1">S/</span>{(subtotalWithDiscount + totalPackaging).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => setStep(2)} className="w-full rounded-xl border-2 border-cm-border bg-cm-accent hover:-translate-y-1 transition-all">
                          <div className="py-4 flex justify-center items-center gap-2 text-white font-black tracking-widest text-sm">
                            DATOS Y PAGO <ArrowRight className="w-4 h-4" />
                          </div>
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── STEP 2: CHECKOUT ─── */}
                {step === 2 && (
                  <motion.div key="step2" custom={1} variants={animVariants} initial="hidden" animate="visible" exit="exit"
                    className="absolute inset-0 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide pb-[280px]">
                      {initialMesa ? (
                        <div className="bg-cm-surface border-2 border-cm-accent/30 rounded-2xl p-4 flex items-center gap-3 shadow-cm-sm">
                          <div className="w-10 h-10 rounded-xl bg-cm-accent/10 border border-cm-accent/20 flex items-center justify-center shrink-0">
                            <Utensils className="w-5 h-5 text-cm-accent" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-cm-accent uppercase tracking-widest">Pedido en Local</p>
                            <p className="text-sm font-bold text-cm-text">Mesa asignada: <span className="font-black text-cm-accent text-base">{initialMesa}</span></p>
                          </div>
                        </div>
                      ) : (
                        <OrderTypeSelector orderType={orderType} setOrderType={setOrderType} setLocation={setLocation} setMesa={setMesa} setDeliveryFeeOverride={setDeliveryFeeOverride} setPackaging={setPackaging} showMesa={showMesa} />
                      )}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase">2. Datos de Contacto</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                          <input type="text" placeholder="Tu Nombre (Ej. Juan Pérez)" maxLength={100} value={customerName} onChange={e => setCustomerName(e.target.value)}
                            className="w-full bg-cm-bg-alt border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                            <input type="tel" placeholder="Teléfono (Ej. 999 888 777)" maxLength={15} value={customerPhone}
                              onChange={e => { setCustomerPhone(e.target.value); if (phoneError) setPhoneError(''); }}
                              onBlur={() => { const c = isPhone(customerPhone); setPhoneError(c.valid ? '' : c.error); }}
                              className={`w-full bg-cm-bg-alt border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none text-cm-text placeholder:text-cm-text-tertiary ${phoneError ? 'border-cm-error' : 'border-cm-border focus:border-cm-accent'}`} />
                            {phoneError && <p className="text-[0.65rem] font-bold text-cm-error mt-1.5 ml-1">{phoneError}</p>}
                          </div>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                            <input type="email" placeholder="Email (opcional — para historial y puntos)" maxLength={100} value={customerEmail}
                              onChange={e => { setCustomerEmail(e.target.value); if (emailError) setEmailError(''); }}
                              onBlur={() => { const c = isEmail(customerEmail); setEmailError(c.valid ? '' : c.error); }}
                              className={`w-full bg-cm-bg-alt border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none text-cm-text placeholder:text-cm-text-tertiary ${emailError ? 'border-cm-error' : 'border-cm-border focus:border-cm-accent'}`} />
                            {emailError && <p className="text-[0.65rem] font-bold text-cm-error mt-1.5 ml-1">{emailError}</p>}
                          </div>
                        {orderType === 'mesa' ? (
                          initialMesa ? null : (
                            activeBranch?.tableCount > 0 ? (
                              <div className="pt-2">
                                <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase block mb-2">Selecciona tu Mesa</label>
                                <div className="grid grid-cols-5 gap-2 mb-2">
                                  {Array.from({ length: activeBranch.tableCount }, (_, i) => i + 1).map(n => (
                                    <button key={n} type="button" onClick={() => { setMesa(n); setLocation(''); }}
                                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${mesa === n ? 'bg-cm-accent border-cm-accent text-white' : 'bg-white/50 border-cm-border text-cm-text-secondary hover:bg-cm-surface'}`}>
                                      {n}
                                    </button>
                                  ))}
                                </div>
                                <input type="text" placeholder="Otra mesa (ej. VIP 1)" maxLength={100} value={location} onChange={e => { setLocation(e.target.value); setMesa(null); }}
                                  className="w-full bg-cm-bg-alt border border-cm-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
                              </div>
                            ) : (
                              <div className="relative pt-2">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                                <input type="text" maxLength={200}
                                  placeholder="Número de Mesa"
                                  value={location} onChange={e => setLocation(e.target.value)}
                                  className="w-full bg-cm-bg-alt border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
                              </div>
                            )
                          )
                        ) : (
                          <div className="relative pt-2" ref={orderType === 'delivery' ? suggestRef : null}>
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-cm-text-tertiary pointer-events-none z-10" />
                            <input type="text" maxLength={200}
                              placeholder={orderType === 'llevar' ? 'Hora de recojo (ej. 14:30)' : 'Dirección completa y referencias'}
                              value={location}
                              onChange={e => { setLocation(e.target.value); if (locationError) setLocationError(''); }}
                              onBlur={() => {
                                if (orderType === 'llevar' && location.trim()) {
                                  const c = isTime(location);
                                  setLocationError(c.valid ? '' : c.error);
                                } else {
                                  setLocationError('');
                                }
                                // Delay closing suggestions so click registers
                                setTimeout(() => setShowSuggestions(false), 200);
                              }}
                              className={`w-full bg-cm-bg-alt border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none text-cm-text placeholder:text-cm-text-tertiary ${locationError ? 'border-cm-error' : 'border-cm-border focus:border-cm-accent'}`} />
                            {locationError && orderType === 'llevar' && <p className="text-[0.65rem] font-bold text-cm-error mt-1.5 ml-1">{locationError}</p>}
                            {orderType === 'delivery' && showSuggestions && suggestions.length > 0 && (
                              <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-cm-surface border border-cm-border rounded-xl shadow-cm-lg overflow-hidden max-h-60 overflow-y-auto">
                                {suggestions.map((place, i) => (
                                  <li key={i}>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(place); }}
                                      className="w-full text-left px-4 py-3 text-sm text-cm-text hover:bg-cm-accent/10 border-b border-cm-border/50 last:border-b-0 transition-colors">
                                      <span className="font-medium">{place.display_name?.split(',')[0]}</span>
                                      <span className="text-cm-text-tertiary block text-xs truncate">{place.display_name}</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                      {orderType === 'delivery' && activeBranch?.deliveryEnabled && (
                        <div className="space-y-4 p-4 bg-white/30 rounded-2xl border border-cm-border">
                          {isGeocoding && <p className="text-xs text-cm-accent font-bold flex items-center gap-1"><Navigation className="w-3 h-3 animate-spin" /> Calculando distancia...</p>}
                          {distanceKm != null && (
                            <div className="flex justify-between items-center bg-cm-bg-alt rounded-xl px-3 py-2 border border-cm-border">
                              <p className="text-xs text-cm-text-secondary flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" /> Distancia: <strong className="text-cm-text">{geoService.formatDistance(distanceKm)}</strong>
                              </p>
                              {calculatedKmFee != null && <span className="text-xs text-cm-text font-bold bg-cm-accent/10 px-2 py-1 rounded-md">S/ {calculatedKmFee.toFixed(2)}</span>}
                            </div>
                          )}
                          {zones.filter(z => z.active !== false).length > 0 && (
                            <div>
                              <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase block mb-2">Zona de entrega</label>
                              <div className="grid grid-cols-2 gap-2">
                                {zones.filter(z => z.active !== false).sort((a, b) => (a.priority || 0) - (b.priority || 0)).map(z => (
                                  <button key={z.id} type="button" onClick={() => { setSelectedZoneId(z.id); setDeliveryFeeOverride(null); }}
                                    className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-bold border transition-all ${selectedZoneId === z.id ? 'bg-cm-accent/20 border-cm-accent text-cm-accent' : 'bg-white/50 border-cm-border text-cm-text-secondary hover:bg-cm-surface'}`}>
                                    <span>{z.name}</span>
                                    {z.estimatedMinutes && <span className="text-[0.6rem] font-medium opacity-70 mt-0.5">~{z.estimatedMinutes} min</span>}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase">Costo de Delivery</label>
                            {zoneFreeThreshold > 0 && subtotal >= zoneFreeThreshold ? (
                              <div className="bg-cm-success/10 border border-cm-success/20 text-cm-success rounded-xl p-3 flex items-center gap-2 text-sm font-bold">
                                <CheckCircle className="w-4 h-4" /> Delivery gratis.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="w-full bg-cm-bg-alt border border-cm-border rounded-xl px-4 py-3 text-sm font-black text-cm-text flex items-center justify-between">
                                  <span className="text-cm-text-secondary font-bold">Monto calculado</span>
                                  <span className="text-cm-accent text-base">
                                    S/ {(deliveryFeeOverride ?? (calculatedKmFee ?? (selectedZone ? zoneFee : activeBranch?.deliveryFee ?? 5))).toFixed(2)}
                                  </span>
                                </div>
                                {zoneEta && <p className="text-xs text-cm-accent flex items-center gap-1 font-bold"><Clock className="w-3.5 h-3.5" /> ~{zoneEta} min</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* ── Puntos HOUSE ── */}
                      <PointsSection
                        customerAuth={customerAuth}
                        pointsBalance={pointsBalance}
                        usePoints={usePoints}
                        setUsePoints={setUsePoints}
                        pointsToRedeem={pointsToRedeem}
                        setPointsToRedeem={setPointsToRedeem}
                        maxPointsRedeemable={maxPointsRedeemable}
                        pointsDiscountAmount={pointsDiscountAmount}
                        POINTS_RATE={POINTS_RATE}
                      />
                      <PaymentSelector paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />
                      {orderType !== 'mesa' && (
                        <div className="bg-cm-success/10 border border-cm-success/20 rounded-2xl p-4 flex items-start gap-3">
                          <Package className="w-5 h-5 text-cm-success shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-black text-cm-success uppercase tracking-widest">Empaques Incluidos</p>
                            <p className="text-[11px] text-cm-success/80">Envases térmicos y cubiertos incluidos sin costo adicional.</p>
                          </div>
                        </div>
                      )}
                      {submitError && (
                        <div className="flex items-start gap-2 p-3 bg-cm-error/10 border border-cm-error/30 rounded-xl text-sm text-cm-error font-medium">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{submitError}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-cm-surface border-t border-cm-border z-30">
                      <div className="flex flex-col gap-1 pb-3 mb-3 border-b border-cm-border">
                        <div className="flex justify-between text-xs text-cm-text-secondary">
                          <span>Subtotal</span>
                          <span>S/ {subtotalWithDiscount.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && <div className="flex justify-between text-xs font-bold text-cm-success"><span>Descuento</span><span>- S/ {discountAmount.toFixed(2)}</span></div>}
                        {pointsDiscountAmount > 0 && <div className="flex justify-between text-xs font-bold text-amber-400"><span>Puntos canjeados</span><span>- S/ {pointsDiscountAmount.toFixed(2)}</span></div>}
                        {totalPackaging > 0 && <div className="flex justify-between text-xs text-cm-text-secondary"><span>Empaques</span><span>S/ {totalPackaging.toFixed(2)}</span></div>}
                        {effectiveDeliveryFee > 0 && <div className="flex justify-between text-xs text-cm-text-secondary"><span>Delivery</span><span>S/ {effectiveDeliveryFee.toFixed(2)}</span></div>}
                        {tipAmount > 0 && <div className="flex justify-between text-xs text-cm-accent"><span>Propina ({tipPercentage}%)</span><span>S/ {tipAmount.toFixed(2)}</span></div>}
                      </div>
                      <button disabled={!customerName?.trim() || (orderType === 'mesa' ? !mesa && !location.trim() : !location.trim()) || !customerPhone.trim() || isSubmitting}
                        className="w-full rounded-xl border-2 border-cm-border bg-cm-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                          if (validateForm()) return; // no pasar si hay errores de formato
                          if (paymentMethod === 'yape_plin') setStep(3);
                          else handleConfirmOrder();
                        }}>
                        <div className="py-4 px-5 flex justify-between items-center text-white font-black tracking-widest text-sm">
                          {isSubmitting ? (
                            <div className="flex items-center gap-2 text-sm justify-center w-full">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> PROCESANDO...
                            </div>
                          ) : (
                            <>                            <span>{paymentMethod === 'yape_plin' ? 'PAGAR CON YAPE / PLIN' : 'CONFIRMAR PEDIDO'}</span><span className="text-xl">S/ {total.toFixed(2)}</span></>
                          )}
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ─── STEP 3: YAPE / PLIN ─── */}
                {step === 3 && (
                  <StepYapePlin
                    selectedWallet={selectedWallet} setSelectedWallet={setSelectedWallet}
                    yapeNumber={yapeNumber} yapeName={yapeName} yapeQrUrl={yapeQrUrl} plinNumber={plinNumber} plinName={plinName}
                    operationNumber={operationNumber} setOperationNumber={setOperationNumber}
                    handleFileUpload={handleFileUpload} isUploading={isUploading} voucherUploaded={voucherUploaded}
                    fileName={fileName} copiedStatus={copiedStatus} handleCopyNumber={handleCopyNumber}
                    submitError={submitError} step={step} setStep={setStep}
                    handleConfirmOrder={handleConfirmOrder} isSubmitting={isSubmitting} total={total}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
