import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users, Info, ArrowLeft } from 'lucide-react';
import WhatsAppSender from '../marketing/WhatsAppSender';

/**
 * Wraps WhatsAppSender with CRM segment context.
 * Maps targetCustomers[] to WhatsAppSender's GROUPS.
 * Auto-selects "Segmento CRM (N)" when customers are provided.
 * Lets the user fall back to standard groups (all, recent, vip, inactive).
 */

const BASE_GROUPS = [
  { id: 'all', label: 'Todos los clientes', count: 0 },
  { id: 'recent', label: 'Clientes recientes (7d)', count: 0 },
  { id: 'vip', label: 'VIP', count: 0 },
  { id: 'inactive', label: 'Inactivos (>30d)', count: 0 },
];

interface CrmCommunicationProps {
  targetCustomers?: any[];
  onSend?: (payload: any) => void;
  sending?: boolean;
  messages?: any[];
  onDeleteMessage?: (id: string) => void;
}

export default function CrmCommunication({
  targetCustomers = [],
  onSend = () => {},
  sending = false,
  messages = [],
  onDeleteMessage = () => {},
}: CrmCommunicationProps) {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');

  const hasSegment = targetCustomers.length > 0;

  // Count by criteria for base groups
  const groupCounts = useMemo(() => {
    return {
      all: targetCustomers.length,
      recent: targetCustomers.filter((c) => {
        if (!c.lastOrderAt) return false;
        return Date.now() - new Date(c.lastOrderAt).getTime() < 7 * 86400000;
      }).length,
      vip: targetCustomers.filter((c) => c.tier === 'platinum' || c.tier === 'gold').length,
      inactive: targetCustomers.filter((c) => {
        if (!c.lastOrderAt) return true;
        return Date.now() - new Date(c.lastOrderAt).getTime() > 30 * 86400000;
      }).length,
    };
  }, [targetCustomers]);

  // Map groups for WhatsAppSender
  const GROUPS = useMemo(() => {
    const groups = [
      ...(hasSegment
        ? [{ id: 'segment', label: `Segmento CRM (${targetCustomers.length})`, count: targetCustomers.length }]
        : []),
      ...BASE_GROUPS.map((g) => ({
        ...g,
        count: groupCounts[g.id as keyof typeof groupCounts] || 0,
      })),
    ];
    return groups;
  }, [hasSegment, targetCustomers, groupCounts]);

  // If no segment and no target, show a landing card
  if (!hasSegment && !showWhatsApp) {
    return (
      <div className="rounded-xl border border-cm-border bg-cm-surface p-8 shadow-cm-sm">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <MessageCircle className="h-12 w-12 text-cm-text-tertiary" />
          <h3 className="text-sm font-bold text-cm-text">Comunicación con clientes</h3>
          <p className="text-xs text-cm-text-secondary max-w-md">
            Usá la pestaña <strong>Segmentos</strong> para definir un grupo de clientes y luego enviarles mensajes
            personalizados por WhatsApp desde acá.
          </p>
          <button
            onClick={() => setShowWhatsApp(true)}
            className="flex items-center gap-2 rounded-lg bg-cm-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cm-accent-hover"
          >
            <MessageCircle className="h-4 w-4" /> Ir a WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Segment info bar */}
      {hasSegment && (
        <div className="flex items-center justify-between rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cm-accent" />
            <div>
              <p className="text-xs font-bold text-cm-text">Segmento activo</p>
              <p className="text-[10px] text-cm-text-secondary">
                {targetCustomers.length} cliente{targetCustomers.length !== 1 ? 's' : ''} seleccionado
                {targetCustomers.length > 0 && (
                  <> · Gasto total: S/ {targetCustomers.reduce((s, c) => s + (c.totalSpent || 0), 0).toFixed(2)}</>
                )}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-cm-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-cm-accent">
            {targetCustomers.length} targets
          </span>
        </div>
      )}

      {/* WhatsApp sender */}
      <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
        {hasSegment && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-cm-info/5 px-3 py-2">
            <Info className="h-3.5 w-3.5 text-cm-info" />
            <p className="text-[10px] text-cm-text-secondary">
              Los mensajes se enviarán al segmento de {targetCustomers.length} clientes.
              {selectedGroup !== 'segment' && ' Podés cambiar el grupo objetivo abajo.'}
            </p>
          </div>
        )}

        <WhatsAppSender
          onSend={onSend}
          sending={sending}
          messages={messages}
          onDeleteMessage={onDeleteMessage}
        />
      </div>
    </motion.div>
  );
}
