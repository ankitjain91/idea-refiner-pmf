import React, { useMemo, useState } from "react";
import { ShareButtons } from "@/components/shared/ShareButtons";

type Inputs = {
  price: number; freeTrial: boolean; socialCTAs: boolean;
  networkEffect: "none"|"weak"|"strong";
  shareability: "low"|"med"|"high";
  frictionSteps: number; waitlist: boolean;
};

function calc(i: Inputs) {
  let s = 40;
  if (i.freeTrial) s += 8;
  if (i.socialCTAs) s += 10;
  if (i.networkEffect === "weak") s += 10;
  if (i.networkEffect === "strong") s += 20;
  if (i.shareability === "med") s += 8;
  if (i.shareability === "high") s += 18;
  s -= Math.min(i.frictionSteps * 3, 15);
  if (i.waitlist) s -= 5;
  s -= Math.min(Math.max(i.price - 10, 0) * 0.5, 15);
  return Math.max(0, Math.min(100, Math.round(s)));
}

export default function ViralityScoreTile() {
  const [inputs, setInputs] = useState<Inputs>({
    price: 19, freeTrial: true, socialCTAs: true,
    networkEffect: "weak", shareability: "med",
    frictionSteps: 2, waitlist: false
  });

  const score = useMemo(() => calc(inputs), [inputs]);

  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-3">
      <div className="text-lg font-semibold">Virality Score</div>
      <div className="text-4xl font-bold">{score}</div>
      <div className="text-sm opacity-80">Tweak inputs to see how virality changes</div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex items-center justify-between gap-2">
          Price ($)
          <input type="number" className="w-24 rounded border px-2 py-1"
            value={inputs.price} onChange={e=>setInputs(v=>({...v,price:Number(e.target.value)}))}/>
        </label>
        <label className="flex items-center justify-between gap-2">
          Free trial
          <input type="checkbox" checked={inputs.freeTrial}
            onChange={e=>setInputs(v=>({...v,freeTrial:e.target.checked}))}/>
        </label>
        <label className="flex items-center justify-between gap-2">
          Social CTAs
          <input type="checkbox" checked={inputs.socialCTAs}
            onChange={e=>setInputs(v=>({...v,socialCTAs:e.target.checked}))}/>
        </label>
        <label className="flex items-center justify-between gap-2">
          Network effect
          <select className="rounded border px-2 py-1" value={inputs.networkEffect}
            onChange={e=>setInputs(v=>({...v,networkEffect:e.target.value as any}))}>
            <option value="none">none</option><option value="weak">weak</option><option value="strong">strong</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2">
          Shareability
          <select className="rounded border px-2 py-1" value={inputs.shareability}
            onChange={e=>setInputs(v=>({...v,shareability:e.target.value as any}))}>
            <option value="low">low</option><option value="med">med</option><option value="high">high</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2">
          Signup steps
          <input type="number" className="w-20 rounded border px-2 py-1"
            value={inputs.frictionSteps}
            onChange={e=>setInputs(v=>({...v,frictionSteps:Number(e.target.value)}))}/>
        </label>
        <label className="flex items-center justify-between gap-2">
          Waitlist
          <input type="checkbox" checked={inputs.waitlist}
            onChange={e=>setInputs(v=>({...v,waitlist:e.target.checked}))}/>
        </label>
      </div>

      <ShareButtons title="My Virality Score" summary={`${score} — tuned live on SmoothBrains`} />
    </div>
  );
}
