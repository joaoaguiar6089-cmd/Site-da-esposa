import { Instagram, MessageCircle, Heart } from "lucide-react";

const Footer = () => {
  const whatsappLink = "https://wa.me/5597984387295";
  const instagramLink = "https://www.instagram.com/dra_karolineferreira?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

  return (
    <footer className="bg-primary text-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Clinic Info */}
            <div>
              <h3 className="text-xl font-bold mb-4">
                Clínica Dra Karoline Ferreira
              </h3>
              <p className="text-gray-300 mb-4">
                Estética e Saúde Integrativa
              </p>
              <p className="text-sm text-gray-400">
                Cuidando da sua beleza com excelência, segurança e resultados naturais.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Procedimentos</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Botox</li>
                <li>Preenchimento</li>
                <li>Peeling Químico</li>
                <li>Microagulhamento</li>
                <li>Harmonização Facial</li>
                <li>Limpeza de Pele</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contato</h4>
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  (97) 98438-7295
                </p>
                <div className="flex space-x-4">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    <MessageCircle size={20} />
                  </a>
                  <a
                    href={instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <Instagram size={20} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
              © 2024 Clínica Dra Karoline Ferreira. Feito com 
              <Heart size={16} className="text-accent" /> 
              para sua beleza.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;