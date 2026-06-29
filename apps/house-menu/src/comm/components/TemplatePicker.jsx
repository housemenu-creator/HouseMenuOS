/**
 * TemplatePicker — Quick template selector for communication
 *
 * Features:
 * - Row of template buttons with icon + text + priority badge
 * - Tap to send immediately (bypasses compose input)
 * - If template has pre-set channel, switches channel before sending
 * - Visual feedback on send
 */
import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { QUICK_TEMPLATES, PRIORITY_STYLES } from '../data/templates';

/**
 * Individual template button
 */
function TemplateButton({ template, onSend, currentChannel }) {
  const priorityStyle = PRIORITY_STYLES[template.priority] || PRIORITY_STYLES.NORMAL;
  const needsChannelSwitch = template.channel && template.channel !== currentChannel;

  const handleClick = useCallback(() => {
    onSend(template, needsChannelSwitch);
  }, [onSend, template, needsChannelSwitch]);

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.95 }}
      className="
        relative flex flex-col items-center gap-0.5 p-2
        bg-cm-surface hover:bg-cm-surface-hover
        rounded-lg transition-colors min-w-[70px]
      "
      title={`Enviar a #${template.channel || 'actual'}`}
    >
      {/* Priority dot */}
      <span
        className={`
          absolute top-1 right-1 w-2 h-2 rounded-full
          ${priorityStyle.bg}
        `}
      />

      {/* Label */}
      <span className="text-lg">{template.label.split(' ')[0]}</span>
      <span className="text-[10px] text-cm-text-secondary leading-tight text-center px-1">
        {template.label.split(' ').slice(1).join(' ')}
      </span>

      {/* Channel indicator if different */}
      {needsChannelSwitch && (
        <span className="text-[8px] text-cm-accent">
          → #{template.channel}
        </span>
      )}
    </motion.button>
  );
}

/**
 * TemplatePicker Component
 * @param {Object} props
 * @param {Function} props.onSendTemplate - Callback: (template, needsChannelSwitch) => void
 * @param {Function} props.onSwitchChannel - Callback: (channelId) => void
 * @param {string} props.currentChannel - Current channel ID
 * @param {boolean} props.showToast - Toast notification function
 */
export function TemplatePicker({ onSendTemplate, onSwitchChannel, currentChannel, showToast }) {
  const handleSend = useCallback(
    (template, needsChannelSwitch) => {
      // If template targets different channel, switch first then send
      if (needsChannelSwitch && onSwitchChannel) {
        onSwitchChannel(template.channel);
      }

      // Send the template
      if (onSendTemplate) {
        onSendTemplate(template);
      }

      if (showToast) {
        showToast(`Enviado: ${template.label}`, 'success');
      }
    },
    [onSwitchChannel, onSendTemplate, showToast]
  );

  return (
    <div className="px-3 py-2 border-b border-cm-border bg-cm-bg">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        <AnimatePresence mode="popLayout">
          {QUICK_TEMPLATES.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <TemplateButton
                template={template}
                onSend={handleSend}
                currentChannel={currentChannel}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default TemplatePicker;