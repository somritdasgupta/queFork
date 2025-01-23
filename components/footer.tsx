import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { AnimatedLogo } from './animated-logo';

const Footer = () => {
  return (
    <footer className="w-full bg-slate-900/50 backdrop-blur text-slate-400 py-2">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <AnimatedLogo 
              animate={false} 
              showSubtitle={true} 
              size="sm" 
              subtitlePosition="right"
              primaryColor="text-slate-50"
              secondaryColor="text-blue-500"
              subtitleColor="text-slate-500"
            />
          </div>
      
          {/* Right section */}
          <div className="flex space-x-3">
            <a
              href="https://github.com/somritdasgupta/queFork"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all duration-200 border border-slate-700"
            >
              <FaGithub className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="https://linkedin.com/in/somritdasgupta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all duration-200 border border-slate-700"
            >
              <FaLinkedin className="h-4 w-4 text-slate-400" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;