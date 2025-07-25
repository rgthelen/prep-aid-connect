import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AIShowcase from "@/components/AIShowcase";
import EmergencyStatusDemo from "@/components/EmergencyStatusDemo";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <AIShowcase />
      <EmergencyStatusDemo />
      <Features />
      <Footer />
    </div>
  );
};

export default Index;