import { useState, useEffect } from "react";
import { Menu, X, GraduationCap } from "lucide-react";
import { Link } from "react-router";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 bg-background ${scrolled ? " backdrop-blur-md py-3 shadow-lg" : "bg-transparent py-5"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-[#3ecf8e] p-1.5 rounded-lg">
              <GraduationCap className="text-black w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              EDU<span className="text-[#3ecf8e]">NEXUS</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <a
              href="#home"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              Overview
            </a>
            <a
              href="#programs"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              Programs
            </a>
            <a
              href="#stats"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              Research
            </a>
            <a
              href="#assistant"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              AI Guide
            {/* </a>
            <button className="bg-[#3ecf8e] text-black px-5 py-2 rounded-md font-bold hover:bg-[#34b27b] transition-all transform hover:scale-105">
              Apply Now
            </button> */}
            </a>
            <Link
            to="/login"
            className="w-full bg-[#3ecf8e] text-black px-5 py-3 rounded-md font-bold text-center">
              LOGIN
            </Link>
          </div>

          {/* Mobile button */}
          <div className="md:hidden flex items-center space-x-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 dark:text-gray-300"
            >
              {isOpen ? (
                <X className="w-8 h-8" />
              ) : (
                <Menu className="w-8 h-8" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-gray-800 px-4 pt-2 pb-6 space-y-4">
          <a
            href="#home"
            className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium"
          >
            Overview
          </a>
          <a
            href="#programs"
            className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium"
          >
            Programs
          </a>
          <a
            href="#stats"
            className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium"
          >
            Research
          </a>
          <a
            href="#assistant"
            className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium"
          >
            AI Guide
          </a>
          <button className="w-full bg-[#3ecf8e] text-black px-5 py-3 rounded-md font-bold text-center">
            Apply Now
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
