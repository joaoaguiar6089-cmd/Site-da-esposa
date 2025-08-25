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
    <Card className="group overflow-hidden rounded-xl shadow-lg border border-gray-100 transition-all duration-500 hover:shadow-2xl hover:border-red-100 hover:scale-[1.01] bg-white">
      <div className="relative overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4">
          <Badge className="text-sm font-bold bg-white/90 text-red-600 px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
            {price}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between">
          <CardTitle className="text-2xl font-bold text-red-700 tracking-tight leading-snug mb-2 md:mb-0">
            {title}
          </CardTitle>
          <div className="flex gap-2 flex-wrap mt-2 md:mt-0">
            {duration && (
              <Badge variant="outline" className="text-xs font-semibold text-gray-600 border-gray-300">
                {duration}
              </Badge>
            )}
            {sessions && sessions > 1 && (
              <Badge variant="secondary" className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200">
                {sessions} sessões
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-base text-gray-600 mt-2">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {indication && (
            <div>
              <h4 className="font-bold text-sm text-red-600 mb-2">Indicado para:</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{indication}</p>
            </div>
          )}
          
          <div>
            <h4 className="font-bold text-sm text-red-600 mb-2">Benefícios:</h4>
            <ul className="space-y-1">
              {benefits.map((benefit, index) => (
                <li key={index} className="text-sm text-gray-500 flex items-start">
                  <span className="text-red-400 mr-2">✦</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          
          <Button 
            onClick={handleAgendamento}
            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg" 
          >
            Agendar Consulta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcedureCard;