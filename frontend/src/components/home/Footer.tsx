import {
  GraduationCap,
  Github,
  Twitter,
  Linkedin,
  ArrowUp,
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="pt-20 pb-10 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="bg-[#3ecf8e] p-1.5 rounded-lg">
                <GraduationCap className="text-black w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white uppercase">
                Edunexus
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-500 leading-relaxed">
              Redefining higher education through technology, innovation, and
              global connectivity. Join the frontier.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-[#3ecf8e] hover:text-black transition-all text-gray-500 dark:text-gray-400 shadow-sm"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-[#3ecf8e] hover:text-black transition-all text-gray-500 dark:text-gray-400 shadow-sm"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-[#3ecf8e] hover:text-black transition-all text-gray-500 dark:text-gray-400 shadow-sm"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-6 text-lg">
              Academics
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Undergraduate
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Postgraduate
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Executive Education
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Online Courses
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Scholarships
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-6 text-lg">
              Resources
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Campus Map
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Library
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Research Portal
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Career Center
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 dark:text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  Alumni Network
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-6 text-lg">
              Newsletter
            </h4>
            <p className="text-gray-600 dark:text-gray-500 mb-6">
              Stay updated with the latest research breakthroughs and campus
              news.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Email address"
                className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 rounded-l-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none w-full"
              />
              <button className="bg-[#3ecf8e] text-black px-4 py-3 rounded-r-lg font-bold hover:bg-[#34b27b] transition-colors">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
          <p>© 2025 Edunexus University. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="#"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cookie Settings
            </a>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-6 md:mt-0 p-3 rounded-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 hover:border-[#3ecf8e] transition-all group shadow-sm"
          >
            <ArrowUp className="w-5 h-5 group-hover:text-[#3ecf8e] text-gray-400" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
