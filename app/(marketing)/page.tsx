// Dream Helixion landing page — section components (Header/Footer in layout)
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import ServiceSection from "@/components/sections/ServiceSection";
import PricingSection from "@/components/sections/PricingSection";
import FaqSection from "@/components/sections/FaqSection";
import Chatbot from "@/components/Chatbot";

export default function Home() {
  return (
    <>
      <main>
        <HeroSection />
        <FeaturesSection />
        <ServiceSection />
        <PricingSection />
        <FaqSection />
      </main>
      <Chatbot />
    </>
  );
}
