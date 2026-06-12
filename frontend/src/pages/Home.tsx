import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import StarryMedlogHero from "@/components/home/StarryMedlogHero";

const Home = () => {
  return (
    <div>
      <Navbar />
      <main>
        <StarryMedlogHero />
      </main>
      <Footer />
    </div>
  );
};

export default Home;

