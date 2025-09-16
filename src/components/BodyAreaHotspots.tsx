import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { BodyArea } from "@/services/appointments";


export function BodyAreaHotspots({
imageUrl,
areas,
selected,
onToggle,
}: {
imageUrl: string;
areas: BodyArea[];
selected: Set<string>;
onToggle: (id: string) => void;
}) {
const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });


return (
<div className="grid gap-3">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={imageUrl}
alt="Mapa de áreas"
className="w-full h-auto rounded-xl shadow"
onLoad={(e) => {
const el = e.currentTarget as HTMLImageElement;
setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
}}
/>
<svg className="absolute -mt-[0] w-full h-0" /> {/* spacing keeper */}
<div className="relative -mt-[calc(100%)] pointer-events-none">
<svg className="w-full h-auto" viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}>
{areas.map((a) => {
if (!a.coordinates || a.coordinates.length < 3) return null;
const pts = a.coordinates.map(([x, y]) => `${x * imgSize.w},${y * imgSize.h}`).join(" ");
const isOn = selected.has(a.id);
return (
<polygon
key={a.id}
points={pts}
className="pointer-events-auto"
onClick={(e) => {
e.preventDefault();
onToggle(a.id);
}}
fill={isOn ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.05)"}
stroke={isOn ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.3)"}
strokeWidth={2}
/>
);
})}
</svg>
</div>


{/* Lista textual como fallback/acessibilidade */}
<div className="grid md:grid-cols-2 gap-2">
{areas.map((a) => (
<label key={a.id} className="flex items-center gap-2 border rounded-xl p-2">
<Checkbox checked={selected.has(a.id)} onCheckedChange={() => onToggle(a.id)} />
<span className="text-sm">{a.name}</span>
<Badge variant="secondary" className="ml-auto">R$ {a.price.toFixed(2)}</Badge>
</label>
))}
</div>
</div>
);
}
