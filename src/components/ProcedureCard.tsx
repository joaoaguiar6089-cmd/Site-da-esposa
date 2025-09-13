import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProcedureCardProps {
  title: string;
  description: string;
  price: string;
  image: string;
  benefits: string[];
  duration?: string;
  sessions?: number;
  indication?: string;
  procedureId?: string;
}

const ProcedureCard = ({ 
  title, 
  description, 
  price, 
  image, 
  benefits, 
  duration,
  sessions,
  indication,
  procedureId
}: ProcedureCardProps) => {
  const handleAgendamento = () => {
    const url = procedureId 
      ? `/agendamento?procedimento=${procedureId}`
      : '/agendamento';
    window.location.href = url;
  };

  return (
    <Card 
      id={procedureId ? `procedure-${procedureId}` : undefined}
      className="group overflow-hidden hover:shadow-elegant transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-white/90 text-primary font-semibold">
            {price}
          </Badge>
        </div>
      </div>
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-primary">{title}</CardTitle>
          <div className="flex gap-2">
            {duration && (
              <Badge variant="outline" className="text-xs">
                {duration}
              </Badge>
            )}
            {sessions && sessions > 1 && (
              <Badge variant="secondary" className="text-xs">
                {sessions} sessões
              </Badge>
            )}
          </div>
        </div>
        {/* AQUI ESTÁ A ALTERAÇÃO: adicionando a classe "whitespace-pre-line" */}
        <CardDescription className="text-base leading-relaxed whitespace-pre-line">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {indication && (
            <div>
              <h4 className="font-semibold text-sm text-primary mb-2">Indicado para:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{indication}</p>
            </div>
          )}
          
          {benefits && benefits.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-primary mb-2">Benefícios:</h4>
              <ul className="space-y-1">
                {benefits.map((benefit, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="text-accent mr-2">•</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <Button 
            onClick={handleAgendamento}
            className="w-full" 
            variant="default"
          >
            Agendar Consulta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcedureCard;