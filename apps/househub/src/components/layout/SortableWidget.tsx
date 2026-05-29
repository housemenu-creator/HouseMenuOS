import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  id: string;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function SortableWidget({ id, children, className = "", title }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: 'relative' as const,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group ${className} ${isDragging ? "opacity-50 scale-[1.02] shadow-2xl" : ""}`}
    >
      <div className="relative">
        <div 
          {...attributes} 
          {...listeners}
          className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-hub-muted hover:text-hub-accent transition-all z-10"
        >
          <GripVertical size={16} />
        </div>
        {children}
      </div>
    </div>
  );
}
