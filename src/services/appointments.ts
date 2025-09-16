import { supabase } from "@/integrations/supabase/client";
) {
if (specs.length === 0) return;
const { error } = await supabase.from("appointment_specifications").insert(
specs.map((s) => ({
appointment_id,
specification_id: s.specification_id,
specification_name: s.specification_name,
specification_price: s.specification_price,
})),
);
if (error) throw error;
}


export async function insertAppointmentAreas(
appointment_id: string,
areas: { body_area_id: string; area_name: string; area_price: number }[],
) {
if (areas.length === 0) return;
const { error } = await supabase.from("appointment_body_selections").insert(
areas.map((a) => ({
appointment_id,
body_area_id: a.body_area_id,
area_name: a.area_name,
area_price: a.area_price,
})),
);
if (error) throw error;
}


export function applyDiscount(
items: { kind: "spec" | "area"; id: string; unitPrice: number }[],
rules: DiscountRule[],
) {
const areaCount = items.filter((i) => i.kind === "area").length;
const subtotal = items.reduce((acc, i) => acc + i.unitPrice, 0);
let chosen: DiscountRule | undefined;
for (const r of rules) {
const withinMin = areaCount >= r.min_groups;
const withinMax = r.max_groups == null ? true : areaCount <= r.max_groups;
if (withinMin && withinMax) chosen = r;
}
if (!chosen) return { subtotal, discount: 0, finalTotal: subtotal, rule: undefined as DiscountRule | undefined };
const perc = chosen.discount_percentage / 100;
const discount = subtotal * perc;
return { subtotal, discount, finalTotal: Math.max(0, subtotal - discount), rule: chosen };
}
