import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PromotionsSection from "@/components/PromotionsSection";
import About from "@/components/About";
import FeaturedProcedures from "@/components/FeaturedProcedures";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import ProcedureSearch from "@/components/ProcedureSearch";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      {/* Search bar below header */}
      <div className="absolute top-24 left-4 sm:left-8 z-40">
        <ProcedureSearch />
      </div>
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
