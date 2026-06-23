import { Megaphone } from 'lucide-react';

interface Props {
  announcement: string | null;
  defaultPhrase: string;
}

export default function AnnouncementBanner({ announcement, defaultPhrase }: Props) {
  if (!announcement && !defaultPhrase) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-700 to-blue-800 p-4 shadow-cm-md border border-white/5">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 50%)' }} />
      <div className="relative flex items-start gap-3">
        <div className="p-2 rounded-xl bg-white/10 border border-white/15 text-white shrink-0">
          <Megaphone className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-purple-200 mb-1">
            {announcement ? 'Comunicado del Local' : 'Frase del Turno'}
          </p>
          <p className="text-sm font-bold text-white leading-relaxed">
            {announcement || defaultPhrase}
          </p>
        </div>
      </div>
    </div>
  );
}
