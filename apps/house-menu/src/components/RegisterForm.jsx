import { useState } from 'react';
import { UserPlus, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import { submitApplication } from '../lib/applicationsService';

const INPUT_CLS = 'w-full bg-cm-bg border-2 border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors';
const LABEL_CLS = 'block text-xs font-bold text-cm-muted mb-1';

export default function RegisterForm() {
  const [form, setForm] = useState({
    name: '', dni: '', phone: '', address: '', birthDate: '', email: '', password: '',
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSending(true);
    const result = await submitApplication(form);
    setSending(false);
    if (result.success) {
      setDone(true);
      setSentEmail(form.email);
    } else {
      setError(result.error || 'No se pudo enviar la solicitud.');
    }
  };

  if (done) {
    return (
      <div className="flex-1 min-h-0 bg-cm-bg flex items-center justify-center p-4">
        <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl text-cm-accent">Solicitud enviada</h1>
          <p className="text-sm text-cm-muted">
            Recibimos tu registro <span className="font-bold text-cm-text">{sentEmail}</span>. El administrador revisará
            tus datos y te asignará tu puesto, funciones y horario. Te avisaremos cuando esté aprobado.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-cm-accent hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-cm-bg flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-8 max-w-md w-full space-y-4">
        <div className="flex flex-col items-center text-center space-y-2">
          <img src={logo} alt="House Logo" className="w-16 h-16 rounded-2xl object-cover border border-cm-border shadow-cm-md" />
          <div>
            <h1 className="text-2xl text-cm-accent">Registro de trabajador</h1>
            <p className="text-sm text-cm-muted mt-1">
              Completá tus datos. Tu acceso queda <span className="font-bold">pendiente de aprobación</span>.
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLS}>Nombre completo *</label>
          <input className={INPUT_CLS} value={form.name} onChange={set('name')} placeholder="Ej: Juan Pérez" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={LABEL_CLS}>DNI *</label>
            <input className={INPUT_CLS} value={form.dni} onChange={set('dni')} placeholder="12345678" inputMode="numeric" pattern="[0-9]{8}" title="DNI: 8 dígitos" required />
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLS}>Teléfono *</label>
            <input className={INPUT_CLS} value={form.phone} onChange={set('phone')} placeholder="999 999 999" inputMode="tel" required />
          </div>
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLS}>Fecha de nacimiento</label>
          <input type="date" className={INPUT_CLS} value={form.birthDate} onChange={set('birthDate')} />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLS}>Dirección</label>
          <input className={INPUT_CLS} value={form.address} onChange={set('address')} placeholder="Ej: Av. Los Álamos 123" />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLS}>Correo electrónico *</label>
          <input type="email" className={INPUT_CLS} value={form.email} onChange={set('email')} placeholder="tucorreo@ejemplo.com" required autoComplete="email" />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLS}>Contraseña *</label>
          <input type="password" className={INPUT_CLS} value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" minLength={6} required autoComplete="new-password" />
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-red-600 text-sm font-bold bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 disabled:opacity-50 bg-cm-accent text-white font-black rounded-xl py-3 hover:bg-cm-accent-hover transition-colors"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
          {sending ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
        </button>

        <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-bold text-cm-muted hover:text-cm-accent transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}