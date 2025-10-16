import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type SignaturePadTypeProps = {
  className?: string;
  value?: string;
  onChange: (value: string) => void;
};

export const SignaturePadType = ({ 
  className, 
  value, 
  onChange 
}: SignaturePadTypeProps) => {
  return (
    <div className={cn('flex h-full w-full items-center justify-center p-4', className)}>
      <Input
        type="text"
        placeholder="Digite sua assinatura"
        className="w-full bg-transparent text-center text-4xl md:text-5xl lg:text-6xl border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-2xl"
        style={{ 
          fontFamily: 'Dancing Script, cursive',
          fontWeight: 400
        }}
        value={value}
        onChange={(event) => onChange(event.target.value.trimStart())}
      />
    </div>
  );
};
