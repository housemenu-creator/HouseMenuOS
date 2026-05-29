export default function FlatProductFlow({
  product,
  variationsList,
  modifiersList,
  selectedVariation,
  selectedModifiers,
  onSelectVariation,
  onToggleModifier,
  onAddToCart,
  isOutOfStock,
  qtyInCart = 0,
}) {
  const itemTotal = (product?.base_price || 0) +
    (selectedVariation && variationsList.find(v => v.id === selectedVariation)?.adjustPrice || 0) +
    selectedModifiers.reduce((acc, mId) => acc + (modifiersList.find(m => m.id === mId)?.price || 0), 0);

  return (
    <>
      {product?.trackStock && (
        <div className={`p-4 rounded-xl border text-center font-bold text-sm mb-4 ${
          (product.stock ?? 0) > 0
            ? 'bg-cm-success/10 border-cm-success/20 text-cm-success'
            : 'bg-cm-error/10 border-cm-error/20 text-cm-error animate-pulse'
        }`}>
          {(product.stock ?? 0) > 0
            ? `✅ Unidades disponibles en stock: ${product.stock}`
            : '❌ Este plato se encuentra agotado (Sin Stock)'}
        </div>
      )}

      {product?.category === 'Pas Tas' && (
        <div className="bg-cm-accent/10 border border-cm-accent/30 p-4 rounded-xl text-center">
          <p className="text-sm font-bold text-cm-accent">💡 Para potenciar el sabor de su pasta, ¿le agregamos un Huevo Frito o Queso?</p>
        </div>
      )}

      {product?.name.includes('Tallarín') && !product?.name.includes('Saltado de Pollo') && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg tracking-widest text-cm-muted uppercase text-sm">Elige tu Proteína</h3>
          <div className="grid grid-cols-2 gap-3">
            {variationsList.map(v => (
              <button
                key={v.id}
                onClick={() => onSelectVariation(v.id)}
                className={`p-5 rounded-2xl border-2 text-left transition-all shadow-sm hover:-translate-y-1 hover:shadow-cm-md ${
                  selectedVariation === v.id
                    ? 'bg-cm-accent/10 border-cm-accent border-4 text-cm-text'
                    : 'bg-cm-surface border-cm-border text-cm-muted hover:border-cm-accent/50'
                }`}
              >
                <div className="font-bold">{v.name}</div>
                {v.adjustPrice > 0 && <div className="text-xs mt-1 text-cm-accent">+ S/ {v.adjustPrice.toFixed(2)}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-lg tracking-widest text-cm-muted uppercase text-sm">Adicionales</h3>
        <div className="grid grid-cols-2 gap-3">
          {modifiersList.map(mod => (
            <button
              key={mod.id}
              onClick={() => onToggleModifier(mod.id)}
              className={`p-5 rounded-2xl border-2 text-left transition-all shadow-sm hover:-translate-y-1 hover:shadow-cm-md flex flex-col justify-between ${
                selectedModifiers.includes(mod.id)
                  ? 'bg-cm-accent/10 border-cm-accent border-4 text-cm-text'
                  : 'bg-cm-surface border-cm-border text-cm-muted hover:border-cm-accent/50'
              }`}
            >
              <div className="font-bold text-sm">{mod.name}</div>
              <div className="text-xs mt-1 text-cm-accent">+ S/ {mod.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-cm-bg to-transparent z-30 flex gap-4">
        <button
          onClick={onAddToCart}
          disabled={isOutOfStock}
          className={`w-full py-5 text-sm tracking-widest transition-all ${
            isOutOfStock
              ? 'bg-cm-border text-cm-muted rounded-xl font-bold cursor-not-allowed'
              : 'bg-cm-accent text-white shadow-cm-md rounded-xl font-bold'
          }`}
        >
          {isOutOfStock ? (qtyInCart >= (product?.stock ?? 0) ? 'MÁXIMO EN CARRITO' : 'SIN STOCK DISPONIBLE') : `AÑADIR A LA ORDEN • S/ ${itemTotal.toFixed(2)}`}
        </button>
      </div>
    </>
  );
}
