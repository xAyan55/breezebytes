import Header from "../sections/Header.jsx";
import Hero from "../sections/Hero.jsx";
import Features from "../sections/Features.jsx";
import Pricing from "../sections/Pricing.jsx";
import Faq from "../sections/Faq.jsx";
import Testimonials from "../sections/Testimonial.jsx";
import Download from "../sections/Download.jsx";
import Footer from "../sections/Footer.jsx";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-s1 text-p5">
      <Header />
      <main className="overflow-hidden">
        <Hero />
        <Features />
        <Pricing />
        <Faq />
        <Testimonials />
        <Download />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
