import { useState, useEffect, useRef } from 'react';
import { Edit2, Loader2 } from 'lucide-react';

export default function InlineEdit({ value, onSave, type = "text", className = "" }) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setVal(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = async () => {
    if (val !== value && val.toString().trim() !== '') {
      setSaving(true);
      try {
        await onSave(val);
      } catch {
        setVal(value); // revert on error
      }
      setSaving(false);
    } else {
      setVal(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setVal(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="relative inline-flex items-center">
        <input
          ref={inputRef}
          type={type}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className={`bg-cm-surface border-2 border-cm-accent/40 rounded px-1 outline-none focus:border-cm-accent focus:ring-2 focus:ring-cm-accent/20 disabled:opacity-50 ${className}`}
          style={{ minWidth: type === 'number' ? '4rem' : '100%' }}
        />
        {saving && <Loader2 className="w-3 h-3 ml-1 animate-spin text-cm-accent shrink-0" />}
      </div>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-cm-accent/10 rounded px-1 -ml-1 transition-colors relative group/edit ${className}`}
      title="Clic para editar"
    >
      {value}
      <Edit2 className="w-3 h-3 absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/edit:opacity-40 text-cm-accent" />
    </span>
  );
}
