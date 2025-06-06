import { useState, useEffect } from 'react';

interface CircleProgressProps {
  percentage: number;
}

const CircleProgress = ({ percentage }: CircleProgressProps) => {
  const [prevPercentage, setPrevPercentage] = useState(percentage);
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Calculate the circumference of the circle
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the stroke-dashoffset based on the percentage
  const offset = circumference - (percentage / 100) * circumference;
  
  // Add pulse animation when percentage changes
  useEffect(() => {
    if (percentage !== prevPercentage) {
      setIsPulsing(true);
      const timer = setTimeout(() => {
        setIsPulsing(false);
        setPrevPercentage(percentage);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [percentage, prevPercentage]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className={`w-24 h-24 ${isPulsing ? 'scale-110 transition-transform duration-300' : 'transition-transform duration-500'}`} viewBox="0 0 100 100">
        {/* Background circle */}
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          className="stroke-zinc-700 fill-none" 
          strokeWidth="8"
        />
        
        {/* Progress circle */}
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          className={`${
            percentage === 100 
              ? "stroke-green-500" 
              : percentage > 50 
                ? "stroke-amber-300" 
                : "stroke-red-500"
          } fill-none transition-all duration-500 ease-in-out`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      
      {/* Percentage text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white transition-all duration-300">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

export default CircleProgress;
