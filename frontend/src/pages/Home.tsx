import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import Programs from "@/components/home/Programs";
import Footer from "@/components/home/Footer";

const Home = () => {
  return (
    <div>
      <Navbar />
      <main className="">
        <Hero />

        {/* Partnership / Logo Cloud */}
        <section className="py-12 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm font-bold uppercase tracking-widest mb-8">
              Strategic Industry Partners
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                TECHCORE
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                NEXUSLABS
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                SYSTEX
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                QUANTUM_A
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                DATAFLOW
              </span>
            </div>
          </div>
        </section>

        <Stats />
        <Programs />

        {/* Testimonial Highlight */}
        <section className="py-24 bg-white dark:bg-[#121212] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#3ecf8e]/5 blur-[100px] rounded-full"></div>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-16 h-1 bg-[#3ecf8e] rounded-full"></div>
            </div>
            <h3 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-10 leading-tight">
              "The multidisciplinary approach at Edunexus prepared me for a
              career that didn't even exist when I started my degree."
            </h3>
            <div className="flex flex-col items-center">
              <img
                src="https://picsum.photos/seed/edunexus-student/100/100"
                alt="Student"
                className="w-20 h-20 rounded-full border-4 border-[#3ecf8e] mb-4 object-cover"
              />
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                Sarah Chen
              </p>
              <p className="text-[#3ecf8e] font-medium">
                Lead AI Researcher at TechCore • Class of '22
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-linear-to-r from-gray-50 to-white dark:from-[#1c1c1c] dark:to-[#2a2a2a] rounded-[3rem] p-12 md:p-20 text-center border border-gray-200 dark:border-gray-800 relative overflow-hidden shadow-xl dark:shadow-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#3ecf8e]"></div>
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Ready to Shape the Future?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
                Applications for the Fall 2025 semester are closing soon. Take
                the first step towards a boundary-breaking career today.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button className="bg-[#3ecf8e] text-black px-10 py-5 rounded-xl font-bold text-lg hover:bg-[#34b27b] transition-all transform hover:scale-105 shadow-lg shadow-[#3ecf8e]/20">
                  Apply Now
                </button>
                <button className="bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                  Contact Admissions
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
