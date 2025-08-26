import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PromotionsSection from "@/components/PromotionsSection";
import About from "@/components/About";
import FeaturedProcedures from "@/components/FeaturedProcedures";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <PromotionsSection />
      <About />
      <FeaturedProcedures />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
