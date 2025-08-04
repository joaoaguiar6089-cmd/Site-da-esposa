import { Card, CardContent } from "@/components/ui/card";
import { Award, Heart, Users, Zap } from "lucide-react";

const About = () => {
  const features = [
    {
      icon: Award,
      title: "Experiência Profissional",
      description: "Anos de experiência em estética e dermatologia com foco em resultados naturais"
    },
    {
      icon: Heart,
      title: "Cuidado Personalizado",
      description: "Cada tratamento é personalizado de acordo com as necessidades individuais"
    },
    {
      icon: Users,
      title: "Satisfação do Cliente",
      description: "Centenas de clientes satisfeitos com resultados excepcionais"
    },
    {
      icon: Zap,
      title: "Tecnologia Avançada",
      description: "Equipamentos de última geração para procedimentos seguros e eficazes"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">
              Sobre a Clínica
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Na Clínica Dra. Karoline Ferreira, acreditamos que a beleza vai além da aparência. 
              Nossa missão é promover o bem-estar integral através de tratamentos estéticos 
              inovadores e cuidado humanizado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-soft transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gradient-hero rounded-full">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-gradient-subtle rounded-2xl p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl font-bold text-primary mb-6">
                  Dra. Karoline Ferreira
                </h3>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Especialista em estética e saúde integrativa, com formação sólida 
                    e experiência em procedimentos estéticos minimamente invasivos.
                  </p>
                  <p>
                    Atuo com foco na harmonização facial respeitando a individualidade 
                    de cada paciente, sempre priorizando resultados naturais e seguros.
                  </p>
                  <p>
                    Meu compromisso é proporcionar não apenas transformações estéticas, 
                    mas também promover autoestima e bem-estar.
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <h4 className="text-xl font-semibold text-primary mb-4">
                  Nossos Valores
                </h4>
                <ul className="space-y-3">
                  {[
                    "Excelência em atendimento",
                    "Segurança em todos os procedimentos",
                    "Resultados naturais e harmoniosos",
                    "Ética profissional",
                    "Inovação e atualização constante"
                  ].map((value, index) => (
                    <li key={index} className="flex items-center text-muted-foreground">
                      <span className="text-accent mr-3">✓</span>
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;