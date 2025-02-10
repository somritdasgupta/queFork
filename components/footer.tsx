import { FaGithub, FaLinkedin } from "react-icons/fa";
import { AnimatedLogo } from "./animated-logo";

const Footer = () => {
  return (
    <footer className="w-full bg-slate-900 border-t border-slate-800">
      <div className="container mx-auto">
        <div className="flex items-center justify-between px-4">
          {/* Left section - Logo */}
          <div className="flex items-center gap-3">
            <AnimatedLogo
              animate={false}
              showSubtitle={true}
              size="base"
              subtitlePosition="right"
              primaryColor="text-slate-100"
              secondaryColor="text-blue-500"
              subtitleColor="text-slate-500"
            />
          </div>

          {/* Right section - Social links */}
          <div className="flex items-center gap-2 py-1">
            <a
              href="https://github.com/somritdasgupta/queFork/releases/download/pilot/queFork_Interceptor.zip"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-1 rounded-md
              bg-slate-800/50 hover:bg-slate-700/50
              border border-slate-700/50 hover:border-slate-600/50
              text-slate-400 hover:text-slate-300
              transition-all duration-200"
            >
              <img src="/icons/icon192.png" alt="Logo" className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/somritdasgupta/queFork"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-1 rounded-md 
              bg-slate-800/50 hover:bg-slate-700/50 
              border border-slate-700/50 hover:border-slate-600/50
              text-white hover:text-[#f6f8fa] 
              transition-all duration-200"
            >
              <FaGithub className="h-4 w-4" />
            </a>
            <a
              href="https://linkedin.com/in/somritdasgupta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-1 rounded-md
              bg-slate-800/50 hover:bg-slate-700/50
              border border-slate-700/50 hover:border-slate-600/50
              text-[#ffffff]
              transition-all duration-200"
            >
              <FaLinkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
