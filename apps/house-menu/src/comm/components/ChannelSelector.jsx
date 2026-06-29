/**
 * ChannelSelector — Tabs for switching between comm channels
 *
 * Channels defined in paths.js COMM_CHANNEL_CONFIG:
 *   general → #general (all staff)
 *   kitchen → #cocina (kitchen only)
 *   cash    → #caja-delivery (cashiers + delivery)
 *   admin   → #admin (managers only)
 */
import { Hash } from 'lucide-react';
import { useMemo } from 'react';
import { COMM_CHANNEL_CONFIG } from '../../lib/paths';

/** Get channels visible to a role (preserves COMM_CHANNEL_CONFIG order) */
function getChannelsForRole(role) {
  return COMM_CHANNEL_CONFIG.filter((ch) => ch.roles.includes(role));
}

export function ChannelSelector({ currentUserRole = 'guest', currentChannel, onChannelChange }) {
  const availableChannels = useMemo(() => getChannelsForRole(currentUserRole), [currentUserRole]);

  return (
    <div className="flex items-center gap-1 p-2 bg-cm-surface border-b border-cm-border overflow-x-auto">
      {availableChannels.map((channel) => {
        const isActive = channel.id === currentChannel;
        return (
          <button
            key={channel.id}
            onClick={() => onChannelChange(channel.id)}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-md
              text-sm font-medium transition-all duration-150 whitespace-nowrap
              ${isActive
                ? 'bg-cm-accent text-white'
                : 'text-cm-text-secondary hover:bg-cm-surface-hover hover:text-cm-text'
              }
            `}
          >
            <Hash className="w-4 h-4" />
            <span>{channel.label.replace('#', '')}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ChannelSelector;
