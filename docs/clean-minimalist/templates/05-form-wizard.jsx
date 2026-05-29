import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

const STEPS = ['Información', 'Detalles', 'Confirmación']

export default function FormWizard({ title = 'Nuevo registro', steps = STEPS, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const canNext = currentStep < steps.length - 1
  const canPrev = currentStep > 0

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      setSubmitting(true)
      setTimeout(() => { setSubmitting(false); setDone(true) }, 1000)
    } else {
      setCurrentStep(s => s + 1)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-success/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-cm-success" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Completado</h2>
        <p className="text-sm text-cm-text-secondary mt-1">El registro se ha creado exitosamente.</p>
        <button onClick={() => { setCurrentStep(0); setForm({}); setDone(false) }} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          Nuevo registro
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-cm-text">{title}</h1>
        <div className="flex items-center gap-2 mt-6">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= currentStep ? 'bg-cm-accent text-white' : 'bg-cm-border text-cm-text-tertiary'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i <= currentStep ? 'text-cm-text' : 'text-cm-text-tertiary'}`}>
                {label}
              </span>
              {i < steps.length - 1 && <div className={`flex-1 h-px ${i < currentStep ? 'bg-cm-accent' : 'bg-cm-border'}`} />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-cm-surface border border-cm-border rounded-xl p-6 space-y-4"
        >
          <h2 className="text-sm font-medium text-cm-text-secondary uppercase tracking-wider mb-4">{steps[currentStep]}</h2>

          {currentStep === 0 && (
            <>
              <InputField label="Nombre" value={form.name || ''} onChange={v => update('name', v)} />
              <InputField label="Correo" type="email" value={form.email || ''} onChange={v => update('email', v)} />
            </>
          )}

          {currentStep === 1 && (
            <>
              <InputField label="Descripción" value={form.desc || ''} onChange={v => update('desc', v)} />
              <InputField label="Monto" type="number" value={form.amount || ''} onChange={v => update('amount', v)} />
            </>
          )}

          {currentStep === 2 && (
            <div className="space-y-2 text-sm text-cm-text">
              <p><span className="text-cm-text-secondary">Nombre:</span> {form.name}</p>
              <p><span className="text-cm-text-secondary">Correo:</span> {form.email}</p>
              <p><span className="text-cm-text-secondary">Monto:</span> S/ {form.amount}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(s => s - 1)}
          disabled={!canPrev}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cm-text-secondary hover:text-cm-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <button
          onClick={handleNext}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Guardando...' : canNext ? <>Siguiente <ChevronRight className="w-4 h-4" /></> : 'Finalizar'}
        </button>
      </div>
    </div>
  )
}

function InputField({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-cm-text-secondary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-cm-surface border border-cm-border rounded-[--cm-radius-sm] text-sm text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent transition-colors"
      />
    </div>
  )
}
