import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { auth } from '@house/db';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  Store, User, MapPin, Sparkles,
} from 'lucide-react';
import { isFirstRun, completeSetup } from '../lib/onboardingService';
import { useAuth } from '../context/AuthContext';

const STEPS = ['Restaurante', 'Admin', 'Sucursal', 'Confirmar'];

// ── Validation helpers ──

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validPin(v) {
  return /^\d{4,}$/.test(v);
}

// ── Step schemas ──

const STEP_FIELDS = {
  0: ['tenantName'],
  1: ['adminName', 'adminEmail', 'adminPin', 'adminPinConfirm'],
  2: ['branchName'],
};

function validateStep(step, form) {
  switch (step) {
    case 0:
      return form.tenantName?.trim().length >= 2;
    case 1:
      return (
        form.adminName?.trim().length >= 2 &&
        validEmail(form.adminEmail || '') &&
        validPin(form.adminPin || '') &&
        form.adminPin === form.adminPinConfirm
      );
    case 2:
      return form.branchName?.trim().length >= 2;
    default:
      return true;
  }
}

// ── Component ──

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({
    tenantName: '',
    tenantDesc: '',
    adminName: '',
    adminEmail: '',
    adminPin: '',
    adminPinConfirm: '',
    branchName: '',
    branchAddress: '',
    branchPhone: '',
    scheduleOpen: '08:00',
    scheduleClose: '23:00',
  });
  const [anonReady, setAnonReady] = useState(false);
  const [firstRun, setFirstRun] = useState(null); // null = loading
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, value) =>
    setForm(f => ({ ...f, [key]: value }));

  const canNext = currentStep < STEPS.length - 1;
  const canPrev = currentStep > 0;
  const stepValid = validateStep(currentStep, form);

  // ── Detect first run + wait for anonymous auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAnonReady(true);
        const first = await isFirstRun();
        setFirstRun(first);
        // If NOT first run, redirect home
        if (!first) {
          navigate(ROUTES.HOME, { replace: true });
        }
      }
      // Firebase auth still loading — keep waiting
    });
    return unsub;
  }, [navigate]);

  // ── Handle navigation ──
  const handleNext = () => {
    setError(null);
    if (currentStep === STEPS.length - 1) {
      handleSubmit();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const anonUid = auth.currentUser?.uid;
      if (!anonUid) throw new Error('No hay sesión activa');

      const result = await completeSetup({
        anonUid,
        tenant: { name: form.tenantName.trim(), description: form.tenantDesc.trim() },
        admin: { name: form.adminName.trim(), email: form.adminEmail.trim(), pin: form.adminPin },
        branch: {
          name: form.branchName.trim(),
          address: form.branchAddress.trim(),
          phone: form.branchPhone.trim(),
          schedule: { open: form.scheduleOpen, close: form.scheduleClose },
        },
      });

      if (!result.success) throw new Error(result.error);

      // Auto-login with the new admin credentials
      const loginResult = await login(form.adminEmail.trim(), form.adminPin);
      if (!loginResult.success) {
        // If login fails, show success page anyway (they can log in manually)
        console.warn('onboarding: auto-login falló, el admin debe loguearse manualmente');
      }
      setDone(true);
    } catch (err) {
      setError(err.message || 'Error al crear el restaurante');
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    navigate(ROUTES.ADMIN, { replace: true });
  };

  // ── Loading state ──
  if (firstRun === null || !anonReady) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-cm-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-cm-muted tracking-widest uppercase">Preparando...</p>
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (done) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto rounded-full bg-cm-success/10 flex items-center justify-center"
          >
            <CheckCircle2 className="w-10 h-10 text-cm-success" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-cm-text">¡Restaurante creado!</h1>
            <p className="text-sm text-cm-text-secondary mt-2 max-w-sm mx-auto">
              Tu restaurante <strong className="text-cm-text">{form.tenantName}</strong> está listo.
              Ahora podés gestionar pedidos, empleados y más desde el panel.
            </p>
          </div>
          <button
            onClick={handleFinish}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-semibold hover:bg-cm-accent-hover transition-all active:scale-[0.97]"
          >
            Ir al panel <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard ──
  return (
    <div className="min-h-screen bg-cm-bg flex items-start justify-center px-4 py-12 md:py-24">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-cm-accent/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-cm-accent" />
          </div>
          <h1 className="text-xl font-bold text-cm-text">Configurar restaurante</h1>
          <p className="text-sm text-cm-text-secondary">
            Completá los datos para poner tu negocio en línea
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-0 flex-1">
              <div className={`flex items-center gap-2 min-w-0 ${i > 0 ? 'ml-0' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  i <= currentStep
                    ? 'bg-cm-accent text-white'
                    : 'bg-cm-border text-cm-text-tertiary'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-[11px] font-semibold truncate hidden sm:block ${
                  i <= currentStep ? 'text-cm-text' : 'text-cm-text-tertiary'
                }`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i < currentStep ? 'bg-cm-accent' : 'bg-cm-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Steps content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="bg-cm-surface border border-cm-border rounded-xl p-6 space-y-5"
          >
            {/* Step 0: Restaurante */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-cm-border">
                  <Store className="w-5 h-5 text-cm-accent" />
                  <h2 className="text-sm font-bold text-cm-text uppercase tracking-wider">Tu negocio</h2>
                </div>
                <InputField
                  label="Nombre del restaurante *"
                  placeholder="Ej: La Casa del Pozole"
                  value={form.tenantName}
                  onChange={v => update('tenantName', v)}
                  autoFocus
                />
                <InputField
                  label="Descripción"
                  placeholder="Opcional — contá de qué va el local"
                  value={form.tenantDesc}
                  onChange={v => update('tenantDesc', v)}
                />
              </div>
            )}

            {/* Step 1: Admin */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-cm-border">
                  <User className="w-5 h-5 text-cm-accent" />
                  <h2 className="text-sm font-bold text-cm-text uppercase tracking-wider">Cuenta de administrador</h2>
                </div>
                <InputField
                  label="Nombre del admin *"
                  placeholder="Ej: Juan Pérez"
                  value={form.adminName}
                  onChange={v => update('adminName', v)}
                  autoFocus
                />
                <InputField
                  label="Email *"
                  type="email"
                  placeholder="Ej: juan@micasa.com"
                  value={form.adminEmail}
                  onChange={v => update('adminEmail', v)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="PIN * (4+ dígitos)"
                    type="password"
                    placeholder="Ej: 7245"
                    value={form.adminPin}
                    onChange={v => update('adminPin', v)}
                    maxLength={8}
                    inputMode="numeric"
                  />
                  <InputField
                    label="Confirmar PIN *"
                    type="password"
                    placeholder="Repetí el PIN"
                    value={form.adminPinConfirm}
                    onChange={v => update('adminPinConfirm', v)}
                    maxLength={8}
                    inputMode="numeric"
                    error={
                      form.adminPinConfirm && form.adminPin !== form.adminPinConfirm
                        ? 'Los PIN no coinciden'
                        : undefined
                    }
                  />
                </div>
              </div>
            )}

            {/* Step 2: Sucursal */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-cm-border">
                  <MapPin className="w-5 h-5 text-cm-accent" />
                  <h2 className="text-sm font-bold text-cm-text uppercase tracking-wider">Primera sucursal</h2>
                </div>
                <InputField
                  label="Nombre de la sucursal *"
                  placeholder="Ej: Local Centro"
                  value={form.branchName}
                  onChange={v => update('branchName', v)}
                  autoFocus
                />
                <InputField
                  label="Dirección"
                  placeholder="Ej: Av. Principal 123"
                  value={form.branchAddress}
                  onChange={v => update('branchAddress', v)}
                />
                <InputField
                  label="Teléfono"
                  type="tel"
                  placeholder="Ej: 999 888 777"
                  value={form.branchPhone}
                  onChange={v => update('branchPhone', v)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="Apertura"
                    type="time"
                    value={form.scheduleOpen}
                    onChange={v => update('scheduleOpen', v)}
                  />
                  <InputField
                    label="Cierre"
                    type="time"
                    value={form.scheduleClose}
                    onChange={v => update('scheduleClose', v)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Resumen */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-cm-border">
                  <CheckCircle2 className="w-5 h-5 text-cm-accent" />
                  <h2 className="text-sm font-bold text-cm-text uppercase tracking-wider">Confirmar datos</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <SummarySection title="Restaurante">
                    <SummaryRow label="Nombre" value={form.tenantName} />
                    {form.tenantDesc && <SummaryRow label="Descripción" value={form.tenantDesc} />}
                  </SummarySection>
                  <SummarySection title="Administrador">
                    <SummaryRow label="Nombre" value={form.adminName} />
                    <SummaryRow label="Email" value={form.adminEmail} />
                    <SummaryRow label="PIN" value={'•'.repeat(form.adminPin.length)} />
                  </SummarySection>
                  <SummarySection title="Sucursal">
                    <SummaryRow label="Nombre" value={form.branchName} />
                    {form.branchAddress && <SummaryRow label="Dirección" value={form.branchAddress} />}
                    {form.branchPhone && <SummaryRow label="Teléfono" value={form.branchPhone} />}
                    <SummaryRow label="Horario" value={`${form.scheduleOpen} — ${form.scheduleClose}`} />
                  </SummarySection>
                </div>
                {error && (
                  <div className="p-3 rounded-[--cm-radius-sm] bg-cm-error/10 border border-cm-error/20 text-xs text-cm-error font-medium">
                    {error}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={!canPrev || submitting}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-cm-text-secondary hover:text-cm-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <button
            onClick={handleNext}
            disabled={!stepValid || submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-semibold hover:bg-cm-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando...
              </>
            ) : canNext ? (
              <>Siguiente <ChevronRight className="w-4 h-4" /></>
            ) : (
              'Crear restaurante'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function InputField({ label, type = 'text', value, onChange, placeholder, autoFocus, maxLength, inputMode, error }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-cm-text-secondary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`w-full px-3 py-2.5 bg-cm-bg border rounded-[--cm-radius-sm] text-sm text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent transition-colors ${
          error ? 'border-cm-error' : 'border-cm-border'
        }`}
      />
      {error && <p className="text-[11px] text-cm-error mt-1 font-medium">{error}</p>}
    </div>
  );
}

function SummarySection({ title, children }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-cm-text-tertiary uppercase tracking-wider mb-2">{title}</h3>
      <div className="bg-cm-bg rounded-[--cm-radius-sm] p-3 space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-cm-text-secondary">{label}</span>
      <span className="text-cm-text font-medium">{value}</span>
    </div>
  );
}
