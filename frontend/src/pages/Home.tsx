import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import StarryMedlogHero from "@/components/home/StarryMedlogHero";

const Home = () => {
  return (
    <div id="page-home">
      <Navbar />
      <main id="page-home-main">
        <StarryMedlogHero />
      </main>
      <Footer />
    </div>
  );
};

export default Home;

