import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Instagram, MapPin, Clock, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();
  const whatsappLink = "https://wa.me/5597984387295";
  const instagramLink = "https://www.instagram.com/dra_karolineferreira?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">
              Entre em Contato
            </h2>
            <p className="text-xl text-muted-foreground">
              Agende sua consulta e descubra como podemos realçar sua beleza natural
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  Informações de Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Phone className="h-6 w-6 text-accent mt-1" />
                  <div>
                    <h4 className="font-semibold text-primary">Telefone</h4>
                    <p className="text-muted-foreground">(97) 98438-7295</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <MapPin className="h-6 w-6 text-accent mt-1" />
                  <div>
                    <h4 className="font-semibold text-primary">Localização</h4>
                    <p className="text-muted-foreground">
                      Tefé-AM: Avenida Brasil, 63b<br />
                      Manaus: Entre em contato pelo WhatsApp
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Clock className="h-6 w-6 text-accent mt-1" />
                  <div>
                    <h4 className="font-semibold text-primary">Horário de Atendimento</h4>
                    <p className="text-muted-foreground">
                      Segunda a Sexta: 8h às 18h<br />
                      Sábado: 8h às 12h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Actions */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  Fale Conosco
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Entre em contato através dos nossos canais oficiais para 
                  agendar sua consulta ou esclarecer dúvidas sobre nossos procedimentos.
                </p>

                <div className="space-y-4">
                  <Button
                    variant="whatsapp"
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => window.open(whatsappLink, "_blank")}
                  >
                    <MessageCircle className="mr-3 h-5 w-5" />
                    Conversar no WhatsApp
                  </Button>

                  <Button
                    variant="instagram"
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => window.open(instagramLink, "_blank")}
                  >
                    <Instagram className="mr-3 h-5 w-5" />
                    Seguir no Instagram
                  </Button>
                </div>

                <div className="bg-gradient-subtle rounded-lg p-4 mt-6">
                  <h4 className="font-semibold text-primary mb-2">
                    Primeira Consulta
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Na primeira consulta realizamos uma avaliação completa para 
                    entender suas necessidades e elaborar um plano de tratamento 
                    personalizado.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <div className="bg-gradient-hero rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">
                Pronta para transformar sua beleza?
              </h3>
              <p className="text-lg mb-6 opacity-90">
                Agende sua consulta hoje mesmo e descubra o tratamento ideal para você
              </p>
              <Button
                variant="elegant"
                size="lg"
                onClick={() => navigate("/agendamento")}
              >
                Agendar Consulta Agora
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;