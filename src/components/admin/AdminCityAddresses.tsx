import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

type Row = {
  id: string;
  city: string;
  clinic_name: string | null;
  address: string | null;
  map_url: string | null;
};

export default function AdminCityAddresses() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("city_settings")
      .select("id, city_name, clinic_name, address, map_url") as any;
    if (!error && data) {
      setRows(data.map((d: any) => ({ 
        id: d.id,
        city: d.city_name || d.city,
        clinic_name: d.clinic_name,
        address: d.address,
        map_url: d.map_url
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const saveRow = async (idx: number) => {
    const r = rows[idx];
    const { error } = await supabase
      .from("city_settings")
      .update({
        clinic_name: r.clinic_name,
        address: r.address,
        map_url: r.map_url
      } as any)
      .eq("id", r.id);
    if (!error) await fetchRows();
  };

  if (loading) return <div className="p-4">Carregando…</div>;

  return (
    <div className="space-y-4">
      {rows.map((r, idx) => (
        <Card key={r.id}>
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">{r.city}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Nome da unidade</div>
                <Input
                  value={r.clinic_name ?? ""}
                  onChange={(e) => setRows(prev => prev.map((x,i)=> i===idx? {...x, clinic_name: e.target.value}: x))}
                  placeholder="Ex.: Unidade Manaus – Centro"
                />
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Link do mapa (opcional)</div>
                <Input
                  value={r.map_url ?? ""}
                  onChange={(e) => setRows(prev => prev.map((x,i)=> i===idx? {...x, map_url: e.target.value}: x))}
                  placeholder="https://maps.google.com/…"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <div className="text-slate-600 mb-1">Endereço completo</div>
                <Textarea
                  value={r.address ?? ""}
                  onChange={(e) => setRows(prev => prev.map((x,i)=> i===idx? {...x, address: e.target.value}: x))}
                  placeholder="Rua, número, bairro, complemento"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => saveRow(idx)}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
