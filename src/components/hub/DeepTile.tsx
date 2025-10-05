import { useState } from "react";
import { Info, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

export function DeepTile({
  title, kpi, delta, conf, trend, summary, onDetails, children,
}: {
  title: string;
  kpi: { label: string; value: string };
  delta?: { value: string; dir: "up" | "down" | "flat" };
  conf?: "Low" | "Medium" | "High";
  trend?: number[];
  summary?: string[];
  onDetails?: () => Promise<JSX.Element>;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<JSX.Element | null>(null);

  async function openDetails() {
    setOpen(true);
    if (onDetails) setPanel(await onDetails());
  }

  return (
    <Card className="group relative p-4 rounded-2xl bg-white/5 border-white/10 hover:bg-white/[0.07] transition">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-base/6 text-white">{title}</h3>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-semibold text-white">{kpi.value}</div>
            {delta && (
              <Badge variant="outline" className="text-xs">
                {delta.dir === "up" ? "▲" : delta.dir === "down" ? "▼" : "—"} {delta.value}
              </Badge>
            )}
            {conf && <Badge className="text-xs">{conf} confidence</Badge>}
          </div>
        </div>
        <button onClick={openDetails} className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
          Details <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {trend && (
        <div className="mt-3 h-8 w-full opacity-80">
          <svg viewBox={`0 0 ${trend.length-1} 10`} preserveAspectRatio="none" className="w-full h-full">
            <polyline fill="none" stroke="currentColor" strokeWidth="0.5"
              points={trend.map((v,i)=>`${i},${10 - Math.max(0, Math.min(10, (v / Math.max(...trend)) * 10))}`).join(" ")}/>
          </svg>
        </div>
      )}
      {children}

      {summary && (
        <ul className="mt-3 text-sm text-white/80 list-disc list-inside space-y-1">
          {summary.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="p-6 bg-[#0B0D10] border-white/10">
          <div className="flex items-center gap-2 mb-4 text-white">
            <Info className="w-4 h-4" /> <h4 className="text-lg">{title} — Full analysis</h4>
          </div>
          {panel ?? <div className="text-white/70">Loading…</div>}
        </DrawerContent>
      </Drawer>
    </Card>
  );
}
