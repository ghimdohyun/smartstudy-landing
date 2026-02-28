// Dream Helixion landing page — composed from section components

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import ServiceSection from '@/components/sections/ServiceSection';
import PricingSection from '@/components/sections/PricingSection';
import FaqSection from '@/components/sections/FaqSection';
import Chatbot from '@/components/Chatbot';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ServiceSection />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
      <Chatbot />
    </>
  );
}
