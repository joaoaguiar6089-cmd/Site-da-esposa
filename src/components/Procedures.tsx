import ProcedureCard from "./ProcedureCard";
import treatmentRoom from "@/assets/treatment-room.jpg";
import facialTreatment from "@/assets/facial-treatment.jpg";
import consultation from "@/assets/consultation.jpg";

const Procedures = () => {
  const procedures = [
    {
      title: "Botox",
      description: "Tratamento para suavizar rugas e linhas de expressão, proporcionando um aspecto mais jovem e natural.",
      price: "A partir de R$ 400",
      image: treatmentRoom,
      duration: "30-45 min",
      benefits: [
        "Redução de rugas dinâmicas",
        "Prevenção de novas linhas",
        "Resultado natural e duradouro",
        "Procedimento minimamente invasivo"
      ]
    },
    {
      title: "Preenchimento com Ácido Hialurônico",
      description: "Restaura volume facial, define contornos e hidrata a pele profundamente.",
      price: "A partir de R$ 800",
      image: facialTreatment,
      duration: "45-60 min",
      benefits: [
        "Aumento de volume labial",
        "Preenchimento de sulcos",
        "Hidratação profunda",
        "Efeito lifting natural"
      ]
    },
    {
      title: "Peeling Químico",
      description: "Renovação celular para melhorar textura, tonalidade e luminosidade da pele.",
      price: "A partir de R$ 300",
      image: consultation,
      duration: "60 min",
      benefits: [
        "Renovação celular",
        "Melhora da textura",
        "Redução de manchas",
        "Pele mais luminosa"
      ]
    },
    {
      title: "Microagulhamento",
      description: "Estimula a produção de colágeno para rejuvenescimento e melhora da textura da pele.",
      price: "A partir de R$ 250",
      image: treatmentRoom,
      duration: "60-90 min",
      benefits: [
        "Estímulo ao colágeno",
        "Redução de cicatrizes",
        "Melhora da firmeza",
        "Poros menos aparentes"
      ]
    },
    {
      title: "Harmonização Facial",
      description: "Conjunto de procedimentos para equilibrar e harmonizar os traços faciais.",
      price: "Consulte valores",
      image: facialTreatment,
      duration: "90-120 min",
      benefits: [
        "Equilíbrio facial",
        "Contornos definidos",
        "Resultado personalizado",
        "Técnicas avançadas"
      ]
    },
    {
      title: "Limpeza de Pele Profunda",
      description: "Remoção profunda de impurezas, cravos e células mortas para uma pele saudável.",
      price: "A partir de R$ 150",
      image: consultation,
      duration: "90 min",
      benefits: [
        "Remoção de impurezas",
        "Desobstrução dos poros",
        "Pele mais saudável",
        "Hidratação intensa"
      ]
    }
  ];

  return (
    <section id="procedimentos" className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Nossos Procedimentos
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma ampla gama de tratamentos estéticos com tecnologia de ponta 
            e técnicas avançadas para realçar sua beleza natural.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {procedures.map((procedure, index) => (
            <ProcedureCard
              key={index}
              {...procedure}
            />
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Dúvidas sobre qual procedimento é ideal para você?
          </p>
          <p className="text-sm text-muted-foreground">
            Entre em contato para uma avaliação personalizada e descubra o tratamento perfeito para suas necessidades.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Procedures;