# Refatoração: Layout Vertical para Múltiplos Procedimentos

## 📋 Resumo da Mudança

O formulário de agendamento (`NewBookingFlow.tsx`) foi completamente refatorado para implementar um **layout vertical** onde cada procedimento tem sua própria seção completa com dropdown, descrição e especificações.

## 🎯 Objetivo

Melhorar a UX do formulário de múltiplos procedimentos, especialmente para procedimentos que requerem seleção de áreas corporais ou faciais (como Botox), fornecendo:

1. **Formato vertical** - cada procedimento em sua própria seção
2. **Link "Adicionar mais um procedimento"** após cada descrição
3. **Especificações individuais** por procedimento (áreas corporais/faciais)
4. **Box de resumo no final** com síntese de todos os procedimentos e totais

## 🔄 Mudanças Implementadas

### 1. Estrutura de Dados

**Antes:**
```typescript
const [selectedProcedures, setSelectedProcedures] = useState<Array<{
  id: string;
  procedure: Procedure | null;
}>>([]);
```

**Depois:**
```typescript
const [selectedProcedures, setSelectedProcedures] = useState<Array<{
  id: string;
  procedure: Procedure | null;
  specifications?: ProcedureSpecification[];
}>>([{ id: 'proc-1', procedure: null, specifications: [] }]);
```

**Mudança:** 
- Estado inicial agora tem 1 procedimento vazio (em vez de array vazio)
- Cada procedimento tem suas próprias `specifications`

### 2. Layout do Formulário

#### Layout Anterior (Horizontal/Compacto)
```
┌─────────────────────────────┐
│ Dropdown: Procedimento      │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Box de Descrição        │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [+ Adicionar procedimento]  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Lista compacta de proc. │ │
│ │ 1. Avaliação - 30min    │ │
│ │ 2. Botox - 45min        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### Layout Novo (Vertical/Completo)
```
┌─────────────────────────────────┐
│ Procedimento 1                  │
│ Dropdown: [Avaliação ▼]        │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 💫 Avaliação                │ │
│ │ Descrição completa...       │ │
│ │ Duração: 30min | R$ 100,00  │ │
│ └─────────────────────────────┘ │
│                                 │
│ [+ Adicionar mais um proc.]     │
├─────────────────────────────────┤
│ Procedimento 2                  │
│ Dropdown: [Botox ▼]            │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 💫 Botox              [X]   │ │
│ │ Descrição...                │ │
│ │ Duração: 45min | R$ 500,00  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Seleção de Áreas:           │ │
│ │ ☑ Testa                     │ │
│ │ ☑ Glabela                   │ │
│ └─────────────────────────────┘ │
│                                 │
│ [+ Adicionar mais um proc.]     │
├─────────────────────────────────┤
│ 📄 Resumo do Agendamento        │
│ ┌─────────────────────────────┐ │
│ │ 1. Avaliação                │ │
│ │    30min         R$ 100,00  │ │
│ ├─────────────────────────────┤ │
│ │ 2. Botox (Testa, Glabela)   │ │
│ │    45min         R$ 500,00  │ │
│ ├─────────────────────────────┤ │
│ │ Duração Total: 75 minutos   │ │
│ │ Valor Total: R$ 600,00      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 3. Código Implementado

#### Seção de Procedimentos (Vertical)

```tsx
<div className="space-y-6">
  {selectedProcedures.map((item, index) => (
    <div key={item.id} className="space-y-4">
      {/* Dropdown do Procedimento */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">
          <Sparkles className="w-4 h-4" />
          Procedimento {selectedProcedures.length > 1 ? `${index + 1}` : ''}
          <span className="text-destructive">*</span>
        </label>
        <Select 
          value={item.procedure?.id || ""} 
          onValueChange={(value) => {
            // Atualiza o procedimento específico
            const procedure = procedures.find(p => p.id === value);
            const newProcedures = [...selectedProcedures];
            newProcedures[index] = { 
              ...item, 
              procedure: procedure || null, 
              specifications: [] 
            };
            setSelectedProcedures(newProcedures);
          }}
        >
          {/* Dropdown content */}
        </Select>
      </div>

      {/* Box de Descrição */}
      {item.procedure && (
        <Card className="border-2 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-primary rounded-full">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{item.procedure.name}</h3>
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newProcedures = selectedProcedures.filter((_, i) => i !== index);
                        setSelectedProcedures(newProcedures);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.procedure.description}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <span>Duração: {item.procedure.duration}min</span>
                  <span>Valor: {currency(item.procedure.price || 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Especificações (se necessário) */}
      {item.procedure?.requires_specifications && (
        <ProcedureSpecificationSelector
          procedureId={item.procedure.id}
          onSelectionChange={(data) => {
            const newProcedures = [...selectedProcedures];
            newProcedures[index] = { 
              ...item, 
              specifications: data.selectedSpecifications 
            };
            setSelectedProcedures(newProcedures);
          }}
          initialSelections={item.specifications?.map(s => s.id) || []}
        />
      )}

      {/* Link para adicionar mais */}
      {index === selectedProcedures.length - 1 && item.procedure && (
        <button
          type="button"
          onClick={() => {
            setSelectedProcedures([...selectedProcedures, { 
              id: `proc-${Date.now()}`, 
              procedure: null,
              specifications: []
            }]);
          }}
          className="text-sm text-primary hover:text-primary/80"
        >
          <Plus className="h-4 w-4" />
          Adicionar mais um procedimento
        </button>
      )}
    </div>
  ))}
</div>
```

#### Box de Resumo

```tsx
{selectedProcedures.filter(p => p.procedure).length > 0 && (
  <Card className="border-2 border-primary/20">
    <CardHeader>
      <CardTitle className="text-lg">Resumo do Agendamento</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {/* Lista de procedimentos */}
      {selectedProcedures.filter(p => p.procedure).map((item, index) => (
        <div key={item.id} className="flex justify-between py-2 border-b">
          <div className="flex-1">
            <span className="font-medium">{item.procedure!.name}</span>
            {item.specifications && item.specifications.length > 0 && (
              <span className="text-muted-foreground text-sm">
                {' '}({item.specifications.map(s => s.name).join(', ')})
              </span>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {item.procedure!.duration}min
            </div>
          </div>
          <div className="text-sm font-semibold">
            {currency(item.procedure!.price || 0)}
          </div>
        </div>
      ))}
      
      {/* Totais */}
      {selectedProcedures.filter(p => p.procedure).length > 1 && (
        <div className="pt-3 border-t-2 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Duração Total:</span>
            <span className="font-bold">
              {selectedProcedures
                .filter(p => p.procedure)
                .reduce((sum, p) => sum + (p.procedure?.duration || 0), 0)} minutos
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Valor Total:</span>
            <span className="text-lg font-bold text-primary">
              {currency(
                selectedProcedures
                  .filter(p => p.procedure)
                  .reduce((sum, p) => sum + (p.procedure?.price || 0), 0)
              )}
            </span>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### 4. Lógica de Submit Atualizada

#### Validação

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validar se há pelo menos um procedimento selecionado
  const validProcedures = selectedProcedures.filter(sp => sp.procedure !== null);
  if (validProcedures.length === 0) {
    toast({
      title: "Procedimento obrigatório",
      description: "Selecione pelo menos um procedimento.",
      variant: "destructive",
    });
    return;
  }
  
  // Validar especificações obrigatórias
  for (const sp of validProcedures) {
    if (sp.procedure?.requires_specifications && 
        (!sp.specifications || sp.specifications.length === 0)) {
      toast({
        title: "Especificação obrigatória",
        description: `Selecione especificações para ${sp.procedure.name}.`,
        variant: "destructive",
      });
      return;
    }
  }
  
  // Continuar com o fluxo...
};
```

#### Salvamento no Banco

```typescript
// Filtrar apenas procedimentos válidos
const proceduresToSave = selectedProcedures.filter(sp => sp.procedure !== null);
const hasMultipleProcedures = proceduresToSave.length > 1;

// Salvar procedimentos na tabela appointments_procedures
const proceduresData = proceduresToSave.map((sp, index) => ({
  appointment_id: appointment.id,
  procedure_id: sp.procedure!.id,
  order_index: index
}));

await supabase
  .from('appointments_procedures')
  .insert(proceduresData);

// Salvar especificações de cada procedimento
const allSpecifications: any[] = [];
proceduresToSave.forEach(sp => {
  if (sp.specifications && sp.specifications.length > 0) {
    sp.specifications.forEach(spec => {
      allSpecifications.push({
        appointment_id: appointment.id,
        specification_id: spec.id,
        specification_name: spec.name,
        specification_price: spec.price || 0
      });
    });
  }
});

if (allSpecifications.length > 0) {
  await supabase
    .from('appointment_specifications')
    .insert(allSpecifications);
}
```

## 🎨 Fluxo de UX

### 1. Usuário Seleciona Primeiro Procedimento
```
Estado inicial:
- 1 dropdown vazio
- Sem descrição
- Sem link "Adicionar"

Após seleção:
- Dropdown preenchido
- Box de descrição aparece
- Link "Adicionar mais um procedimento" aparece
```

### 2. Usuário Clica em "Adicionar mais um procedimento"
```
- Link desaparece do procedimento 1
- Novo dropdown aparece abaixo
- Novo link aparecerá após selecionar procedimento 2
```

### 3. Usuário Seleciona Procedimento com Especificações (ex: Botox)
```
- Dropdown preenchido
- Box de descrição aparece
- Seletor de áreas corporais/faciais aparece
- Link "Adicionar mais um procedimento" aparece
```

### 4. Box de Resumo Atualiza Automaticamente
```
À medida que procedimentos são adicionados/removidos:
- Lista atualiza
- Especificações aparecem entre parênteses
  Ex: "Botox (Testa, Glabela)"
- Totais recalculam automaticamente
```

## 📊 Benefícios da Refatoração

### UX Melhorada
- ✅ **Clara separação** entre procedimentos
- ✅ **Especificações individuais** por procedimento
- ✅ **Fácil remoção** com botão X em cada card
- ✅ **Síntese visual** no box de resumo
- ✅ **Áreas entre parênteses** no resumo (ex: "Botox (Testa, Glabela)")

### Manutenibilidade
- ✅ **Código mais limpo** - cada procedimento é independente
- ✅ **Especificações associadas** ao procedimento correto
- ✅ **Fácil adicionar** novos campos por procedimento
- ✅ **Validação granular** - verifica especificações de cada procedimento

### Funcionalidade
- ✅ **Múltiplos procedimentos** com áreas diferentes
- ✅ **Salvamento correto** de especificações
- ✅ **Cálculo de totais** preciso
- ✅ **Notificações** incluem todos os procedimentos e áreas

## 🧪 Testes Recomendados

### Caso 1: Procedimento Simples
1. Selecionar "Avaliação"
2. Verificar descrição aparece
3. Submeter
4. Verificar banco de dados

### Caso 2: Múltiplos Procedimentos Simples
1. Selecionar "Avaliação"
2. Clicar em "Adicionar mais um procedimento"
3. Selecionar "Limpeza de Pele"
4. Verificar resumo mostra ambos
5. Verificar totais corretos
6. Submeter
7. Verificar appointments_procedures tem 2 registros

### Caso 3: Procedimento com Especificações
1. Selecionar "Botox"
2. Verificar descrição aparece
3. Selecionar áreas: Testa, Glabela
4. Verificar resumo mostra "Botox (Testa, Glabela)"
5. Submeter
6. Verificar appointment_specifications tem 2 registros

### Caso 4: Múltiplos com Especificações
1. Selecionar "Botox" + áreas (Testa, Glabela)
2. Adicionar "Preenchimento Labial" + área (Lábios)
3. Verificar resumo:
   - "Botox (Testa, Glabela)"
   - "Preenchimento Labial (Lábios)"
4. Verificar totais corretos
5. Submeter
6. Verificar appointments_procedures tem 2 registros
7. Verificar appointment_specifications tem 3 registros

### Caso 5: Remover Procedimento
1. Adicionar 3 procedimentos
2. Clicar X no segundo
3. Verificar lista atualiza
4. Verificar totais recalculam
5. Submeter
6. Verificar apenas 2 procedimentos salvos

## 📝 Notas Técnicas

### Estado Inicial
- Agora começa com 1 procedimento vazio: `[{ id: 'proc-1', procedure: null, specifications: [] }]`
- Permite renderização imediata do dropdown

### Sincronização formData.procedure_id
```typescript
useEffect(() => {
  if (selectedProcedures.length > 0 && selectedProcedures[0].procedure) {
    setFormData(prev => ({ ...prev, procedure_id: selectedProcedures[0].procedure!.id }));
  }
}, [selectedProcedures]);
```
- Mantém `formData.procedure_id` sincronizado com o primeiro procedimento
- Necessário para compatibilidade com código existente

### Especificações por Procedimento
- Cada procedimento tem seu próprio array `specifications`
- `ProcedureSpecificationSelector` atualiza apenas o procedimento correspondente
- Ao salvar, todas as especificações são consolidadas e salvas

### Box de Resumo
- Filtra apenas procedimentos válidos: `selectedProcedures.filter(p => p.procedure)`
- Exibe especificações entre parênteses quando existem
- Recalcula totais automaticamente

## 🔮 Melhorias Futuras

### Possíveis Adições
- [ ] Drag & drop para reordenar procedimentos
- [ ] Duplicar procedimento existente
- [ ] Templates de combinações populares
- [ ] Previsualização do valor com descontos aplicados
- [ ] Estimativa de tempo total considerando intervalos

### Otimizações
- [ ] Lazy load do ProcedureSpecificationSelector
- [ ] Memoização dos totais calculados
- [ ] Virtualization para muitos procedimentos (>10)

## 📚 Arquivos Modificados

- ✅ `src/components/agendamento/NewBookingFlow.tsx` (refatoração completa)

## ✅ Status

- ✅ Layout vertical implementado
- ✅ Especificações por procedimento
- ✅ Box de resumo com áreas entre parênteses
- ✅ Validação granular
- ✅ Salvamento correto no banco
- ✅ Zero erros de compilação
- ⏳ Testes end-to-end pendentes

---

**Data da Refatoração:** 12 de Janeiro de 2025  
**Versão:** 2.0 - Layout Vertical com Especificações Individuais
