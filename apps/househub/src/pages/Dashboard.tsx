import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import StatusPanel from "../components/agents/StatusPanel";
import ActivityFeed from "../components/activity/ActivityFeed";
import ErrorAlerts from "../components/alerts/ErrorAlerts";
import UsageChart from "../components/charts/UsageChart";
import HouseBrief from "../components/charts/HouseBrief";
import AIDailyBrief from "../components/charts/AIDailyBrief";
import NanoBananaGenerator from "../components/layout/NanoBananaGenerator";
import { HouseBriefSkeleton } from "../components/common/Skeleton";
import { SortableWidget } from "../components/layout/SortableWidget";
import { useMetrics } from "../hooks/useMetrics";
import { useSounds } from "../hooks/useSounds";

export default function Dashboard() {
  const { today, loading } = useMetrics();
  const { playSound } = useSounds();
  
  // Persistent widget order
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("hub-widget-order");
    return saved ? JSON.parse(saved) : ["brief", "status", "activity", "charts", "nanobanana", "alerts"];
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!loading) playSound("notify");
  }, [loading, playSound]);

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items: any) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem("hub-widget-order", JSON.stringify(newItems));
        return newItems;
      });
      playSound("click");
    }
  }

  const renderWidget = (id: string) => {
    switch (id) {
      case "brief": return (
        <SortableWidget id="brief" key="brief">
          <AnimatePresence mode="wait">
            {loading ? <HouseBriefSkeleton /> : <HouseBrief />}
          </AnimatePresence>
        </SortableWidget>
      );
      case "status": return <SortableWidget id="status" key="status"><StatusPanel /></SortableWidget>;
      case "activity": return (
        <SortableWidget id="activity" key="activity">
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-hub-muted px-2">Actividad</h2>
            <ActivityFeed compact />
          </div>
        </SortableWidget>
      );
      case "charts": return (
        <SortableWidget id="charts" key="charts">
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-hub-muted px-2">Análisis</h2>
            <UsageChart />
          </div>
        </SortableWidget>
      );
      case "nanobanana": return <SortableWidget id="nanobanana" key="nanobanana"><NanoBananaGenerator /></SortableWidget>;
      case "alerts": return (
        <SortableWidget id="alerts" key="alerts">
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-hub-muted px-2">Alertas</h2>
            <ErrorAlerts />
          </div>
        </SortableWidget>
      );
      default: return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <AIDailyBrief />
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <div className="lg:col-span-3 space-y-8">
              {items.filter((i: string) => ["brief", "status", "activity", "charts"].includes(i)).map(renderWidget)}
            </div>
            <div className="space-y-8">
              {items.filter((i: string) => ["nanobanana", "alerts"].includes(i)).map(renderWidget)}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </motion.div>
  );
}
