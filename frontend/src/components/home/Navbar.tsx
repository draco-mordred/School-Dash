import { useState, useEffect } from "react";
import { Menu, X, Stethoscope, Search, Bell } from "lucide-react";
import { Link } from "react-router-dom";
 
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Set CSS variable for topbar height so other components (sidebar) can align under it.
  useEffect(() => {
    const navEl = document.querySelector('nav');
    if (!navEl) return;
    const setHeight = () => {
      const h = navEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--topbar-height', `${Math.ceil(h)}px`);
    };
    setHeight();
    window.addEventListener('resize', setHeight);
    return () => window.removeEventListener('resize', setHeight);
  }, [scrolled, isOpen]);

  return (
    <nav
      id="top-navbar"
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${scrolled ? 'scrolled py-2' : 'py-3'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#6e56cf] p-1.5 rounded-md">
              <Stethoscope className="text-black w-6 h-6" />
            </div>
            <Link to="/" className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              MED<span className="text-[#6e56cf]">LOG</span>
            </Link>
          </div>

          {/* Center: Links */}
          <div className="hidden lg:flex items-center space-x-8">
            <a href="#home" className="text-gray-700 dark:text-gray-300 hover:text-[#6e56cf] font-medium">Overview</a>
            <a href="#programs" className="text-gray-700 dark:text-gray-300 hover:text-[#6e56cf] font-medium">Programs</a>
            <a href="#stats" className="text-gray-700 dark:text-gray-300 hover:text-[#6e56cf] font-medium">Research</a>
            <a href="#assistant" className="text-gray-700 dark:text-gray-300 hover:text-[#6e56cf] font-medium">AI Guide</a>
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

            <button
              type="button"
              aria-label="Notifications"
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden md:inline-flex"
            >
              <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            <Link to="/register" className="hidden md:inline-flex items-center bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">Register</Link>
            <Link to="/login" className="hidden md:inline-flex items-center bg-[#6e56cf] text-black px-4 py-2 rounded-md font-semibold">Login</Link>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close menu" : "Open menu"}
                className="text-gray-700 dark:text-gray-200"
              >
                {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden mobile-menu px-4 pt-4 pb-6 space-y-4">
          <a href="#home" className="block text-gray-700 dark:text-gray-200 hover:text-[#6e56cf] text-lg font-medium">Overview</a>
          <a href="#programs" className="block text-gray-700 dark:text-gray-200 hover:text-[#6e56cf] text-lg font-medium">Programs</a>
          <a href="#stats" className="block text-gray-700 dark:text-gray-200 hover:text-[#6e56cf] text-lg font-medium">Research</a>
          <a href="#assistant" className="block text-gray-700 dark:text-gray-200 hover:text-[#6e56cf] text-lg font-medium">AI Guide</a>
          <Link to="/register" className="w-full block bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-5 py-3 rounded-md font-bold text-center">Register</Link>
          <Link to="/login" className="w-full block bg-[#6e56cf] text-black px-5 py-3 rounded-md font-bold text-center">Login</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
