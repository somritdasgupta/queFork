import { FaGithub, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white rounded-t-md text-gray-800 py-1.5 shadow-inner border-t-2 border-gray-200 transform-gpu">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center space-x-2">
        <div className="text-lg font-semibold">
        <span className="text-violet-600">que</span>
        <span className="text-gray-800">Fork</span>
        </div>
        <span className="text-sm text-gray-600 items-center mt-0.5">by Somrit Dasgupta</span>
      </div>
  
      {/* Right section */}
      <div className="flex space-x-4">
        <a
        href="https://github.com/somritdasgupta/queFork"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
        <FaGithub className="h-5 w-5" />
        </a>
        <a
        href="https://linkedin.com/in/somritdasgupta"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
        <FaLinkedin className="h-5 w-5" />
        </a>
      </div>
      </div>
    </div>
    </footer>
  );
};

export default Footer;