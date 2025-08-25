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
    <Card className="group overflow-hidden hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 right-4">
          {/* Badge do preço: um pouco maior e mais forte */}
          <Badge className="text-sm font-bold bg-red-600 text-white px-3 py-1 rounded-full shadow-md">
            {price}
          </Badge>
        </div>
      </div>
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-primary">{title}</CardTitle>
          <div className="flex gap-2">
            {/* Badge de duração: agora é um quadrado e o texto está maior e centralizado */}
            {duration && (
              <Badge variant="outline" className="text-sm font-bold w-16 h-8 flex items-center justify-center border-2 border-red-400 text-red-600 bg-red-50">
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
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {indication && (
            <div>
              <h4 className="font-semibold text-sm text-primary mb-2">Indicado para:</h4>
              <p className="text-sm text-muted-foreground">{indication}</p>
            </div>
          )}
          
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