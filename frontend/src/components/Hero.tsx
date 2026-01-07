import React from 'react';
import LetterGlitch from './ui/LetterGlitch';
import DecryptedText from './ui/DecryptedText';
import { ChevronDown, Terminal } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Hero: React.FC = () => {
  const scrollToDashboard = () => {
    // Looks for the <main id="dashboard"> element in App.tsx
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      dashboard.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Dashboard element not found! Make sure App.tsx has <main id='dashboard'>");
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black">
      
      {/* 1. Background Layer */}
      <div className="absolute inset-0 z-0">
        <LetterGlitch 
          glitchColors={["#22c55e", "#15803d", "#14532d"]} // Matrix Green
          glitchSpeed={50}
          centerVignette={false}
          outerVignette={true}
          smooth={true}
        />
        {/* Dark overlay to make text readable over the glitch effect */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
      </div>

      {/* 2. Hero Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6">
        
        {/* Status Badge */}
        <div className="inline-block px-3 py-1 border border-green-500/30 rounded-full bg-green-500/10 text-green-400 text-xs font-mono mb-4 tracking-widest backdrop-blur-md animate-in fade-in zoom-in duration-700">
          SYSTEM ONLINE // v2.0.4
        </div>

        {/* Animated Title */}
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
          <DecryptedText 
            text="ANUBISX CRYPT" 
            speed={80} 
            maxIterations={20} 
            sequential={true} 
            className="text-white drop-shadow-lg"
          />
        </h1>
        
        {/* Subtitle */}
        <p className="text-zinc-300 text-lg md:text-xl font-mono max-w-2xl mx-auto leading-relaxed drop-shadow-md bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-white/5">
          Advanced Server Log Encryption utilizing <span className="text-green-400 font-bold">OpenMP</span> threads and <span className="text-blue-400 font-bold">MPI</span> distributed processing.
        </p>

        {/* Action Button */}
        <div className="pt-8">
          <Button 
            onClick={scrollToDashboard}
            className="group relative bg-white text-black hover:bg-green-500 hover:text-white text-lg px-8 py-6 rounded-none font-bold tracking-tight border-2 border-transparent hover:border-green-400 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
          >
            <Terminal className="w-5 h-5 mr-2 group-hover:animate-pulse" />
            INITIALIZE SYSTEM
          </Button>
        </div>
      </div>

      {/* 3. Scroll Indicator */}
      <div 
        className="absolute bottom-10 z-10 animate-bounce text-white/50 cursor-pointer hover:text-green-400 transition-colors"
        onClick={scrollToDashboard}
      >
        <ChevronDown className="w-10 h-10" />
      </div>
    </div>
  );
};

export default Hero;