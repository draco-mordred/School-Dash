import { useState, useEffect } from "react";
import { Menu, X, GraduationCap, Search, Bell, User } from "lucide-react";
import { Link } from "react-router";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "backdrop-blur-lg bg-white/60 dark:bg-black/40 py-2 shadow-md" : "backdrop-blur-md bg-white/30 dark:bg-black/30 py-3"
      } border-b border-white/20 dark:border-black/20`}
      style={{ WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#3ecf8e] p-1.5 rounded-md">
              <GraduationCap className="text-black w-6 h-6" />
            </div>
            <Link to="/" className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              EDU<span className="text-[#3ecf8e]">NEXUS</span>
            </Link>
          </div>

          {/* Center: Links */}
          <div className="hidden lg:flex items-center space-x-8">
            <a href="#home" className="text-gray-700 dark:text-gray-300 hover:text-[#3ecf8e] font-medium">Overview</a>
            <a href="#programs" className="text-gray-700 dark:text-gray-300 hover:text-[#3ecf8e] font-medium">Programs</a>
            <a href="#stats" className="text-gray-700 dark:text-gray-300 hover:text-[#3ecf8e] font-medium">Research</a>
            <a href="#assistant" className="text-gray-700 dark:text-gray-300 hover:text-[#3ecf8e] font-medium">AI Guide</a>
          </div>

          {/* Right: Search / Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center bg-white/40 dark:bg-black/30 rounded-full px-3 py-1 border border-white/10">
              <Search className="w-4 h-4 text-gray-600 dark:text-gray-300 mr-2" />
              <input
                placeholder="Search"
                className="bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200 w-44"
              />
            </div>

            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden md:inline-flex">
              <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            <Link to="/login" className="hidden md:inline-flex items-center bg-[#3ecf8e] text-black px-4 py-2 rounded-md font-semibold">Login</Link>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 dark:text-gray-200">
                {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white/60 dark:bg-black/50 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-4 pt-4 pb-6 space-y-4">
          <a href="#home" className="block text-gray-700 dark:text-gray-200 hover:text-[#3ecf8e] text-lg font-medium">Overview</a>
          <a href="#programs" className="block text-gray-700 dark:text-gray-200 hover:text-[#3ecf8e] text-lg font-medium">Programs</a>
          <a href="#stats" className="block text-gray-700 dark:text-gray-200 hover:text-[#3ecf8e] text-lg font-medium">Research</a>
          <a href="#assistant" className="block text-gray-700 dark:text-gray-200 hover:text-[#3ecf8e] text-lg font-medium">AI Guide</a>
          <Link to="/login" className="w-full block bg-[#3ecf8e] text-black px-5 py-3 rounded-md font-bold text-center">Login</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
