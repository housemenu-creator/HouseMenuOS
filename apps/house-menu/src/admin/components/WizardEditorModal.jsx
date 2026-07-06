import { Sparkles, X, Plus, Trash2 } from 'lucide-react';
import InlineEdit from './InlineEdit';

export default function WizardEditorModal({ product, onClose, updateField }) {
  const steps = Array.isArray(product.steps) ? product.steps : [];

  const handleUpdateSteps = (newSteps) => {
    updateField(product.id, 'steps', newSteps);
  };

  const handleAddStep = () => {
    const newStep = {
      id: `step_${Date.now()}`,
      title: 'Nuevo Paso',
      type: 'single',
      options: []
    };
    handleUpdateSteps([...steps, newStep]);
  };

  const handleDeleteStep = (stepIndex) => {
    if (window.confirm("¿Eliminar este paso?")) {
      const newSteps = steps.filter((_, i) => i !== stepIndex);
      handleUpdateSteps(newSteps);
    }
  };

  const handleStepChange = (stepIndex, field, value) => {
    const newSteps = [...steps];
    newSteps[stepIndex][field] = value;
    handleUpdateSteps(newSteps);
  };

  const handleAddOption = (stepIndex) => {
    const newSteps = [...steps];
    if (!newSteps[stepIndex].options) newSteps[stepIndex].options = [];
    newSteps[stepIndex].options.push({
      id: `opt_${Date.now()}`,
      name: 'Nueva Opción',
      price: 0,
      icon: '📍'
    });
    handleUpdateSteps(newSteps);
  };

  const handleOptionChange = (stepIndex, optIndex, field, value) => {
    const newSteps = [...steps];
    newSteps[stepIndex].options[optIndex][field] = value;
    handleUpdateSteps(newSteps);
  };

  const handleDeleteOption = (stepIndex, optIndex) => {
    const newSteps = [...steps];
    newSteps[stepIndex].options.splice(optIndex, 1);
    handleUpdateSteps(newSteps);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-cm-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-4 border-cm-border animate-[fadeIn_0.2s_ease]">

        <div className="flex items-center justify-between p-6 border-b-2 border-cm-border bg-cm-bg">
          <div>
            <div className="flex items-center gap-2 text-cm-accent mb-1">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold text-xs tracking-widest uppercase">Constructor de Combos</span>
            </div>
            <h2 className="text-2xl font-black text-cm-text">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cm-error/10 hover:text-cm-error rounded-full transition-colors text-cm-muted"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-cm-bg">
          {steps.length === 0 ? (
            <div className="text-center py-12 text-cm-muted">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">Aún no hay pasos configurados.</p>
              <p className="text-sm">Añade tu primer paso para que el cliente elija sus opciones.</p>
            </div>
          ) : (
            steps.map((step, sIdx) => (
              <div key={step.id} className="bg-cm-surface rounded-xl border-2 border-cm-border shadow-sm p-5 relative group">
                <button
                  onClick={() => handleDeleteStep(sIdx)}
                  className="absolute -top-3 -right-3 bg-cm-error/10 text-cm-error p-1.5 rounded-full border border-cm-error/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cm-error/20"
                  title="Eliminar Paso"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <p className="text-[0.65rem] font-bold text-cm-muted uppercase tracking-widest mb-1">Paso {sIdx + 1}</p>
                    <InlineEdit
                      value={step.title}
                      onSave={(val) => handleStepChange(sIdx, 'title', val)}
                      className="text-lg font-black text-cm-text block w-full"
                    />
                  </div>
                  <div className="shrink-0 flex items-center bg-cm-bg-alt rounded-lg p-1">
                    <button
                      onClick={() => handleStepChange(sIdx, 'type', 'single')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${step.type === 'single' ? 'bg-cm-surface shadow-cm-sm text-cm-accent' : 'text-cm-muted'}`}
                    >
                      Única (Radio)
                    </button>
                    <button
                      onClick={() => handleStepChange(sIdx, 'type', 'multiple')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${step.type === 'multiple' ? 'bg-cm-surface shadow-cm-sm text-cm-accent' : 'text-cm-muted'}`}
                    >
                      Múltiple (Check)
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {(step.options || []).map((opt, oIdx) => (
                    <div key={opt.id} className="flex items-center gap-3 p-2 hover:bg-cm-bg-alt rounded-lg group/opt">
                      <div className="w-10 h-10 rounded-full bg-cm-border flex items-center justify-center shrink-0 border border-cm-border text-xl cursor-pointer hover:bg-cm-accent/10 transition-colors" title="Cambiar Icono (Emoji)">
                        <InlineEdit
                          value={opt.icon || '📍'}
                          onSave={(val) => handleOptionChange(sIdx, oIdx, 'icon', val)}
                          className="w-full h-full text-center bg-transparent border-none focus:ring-0 focus:outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <InlineEdit
                          value={opt.name}
                          onSave={(val) => handleOptionChange(sIdx, oIdx, 'name', val)}
                          className="text-sm font-bold block w-full"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-cm-muted">+S/</span>
                        <InlineEdit
                          value={Number(opt.price || 0).toFixed(2)}
                          type="number"
                          onSave={(val) => handleOptionChange(sIdx, oIdx, 'price', parseFloat(val))}
                          className="text-sm font-black text-cm-accent w-14 text-right"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteOption(sIdx, oIdx)}
                        className="p-1 text-cm-muted hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleAddOption(sIdx)}
                  className="w-full py-2 text-xs font-bold text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors border border-dashed border-cm-accent/30"
                >
                  + Añadir Opción a este paso
                </button>
              </div>
            ))
          )}

          <button
            onClick={handleAddStep}
            className="w-full py-4 rounded-xl border-2 border-dashed border-cm-border text-cm-muted hover:text-cm-accent hover:border-cm-accent hover:bg-cm-accent/5 transition-colors font-black flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Añadir Nuevo Paso
          </button>
        </div>
      </div>
    </div>
  );
}
