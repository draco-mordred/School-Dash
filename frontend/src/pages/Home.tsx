import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import StarryMedlogHero from "@/components/home/StarryMedlogHero";
import LandingPage from "@/components/home/LandingPage";

const Home = () => {
  return (
    <div id="page-home" className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(110,86,207,0.16),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(52,178,123,0.12),_transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(127,90,240,0.2),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(69,182,255,0.16),_transparent_32%)]" />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.78) 1px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "220px 220px, 320px 320px",
            backgroundPosition: "0 0, 100px 120px",
          }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main id="page-home-main">
          <StarryMedlogHero />
          <LandingPage />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Home;

