'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HomeCardProps {
  className?: string;
  img: string;
  title: string;
  description: string;
  handleClick?: () => void;
  features?: string[];
  stats?: { label: string; value: string }[];
  badge?: string;
}

const HomeCard = ({ 
  className, 
  img, 
  title, 
  description, 
  handleClick, 
  features,
  stats,
  badge
}: HomeCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative overflow-hidden',
        'rounded-2xl p-6 h-full',
        'bg-gradient-to-br from-gray-800/50 to-gray-900/50',
        'backdrop-blur-xl border border-gray-800/50',
        'hover:border-gray-700/50 transition-all duration-300',
        'hover:shadow-2xl hover:shadow-blue-500/10',
        className
      )}
      onClick={handleClick}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500/10 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 group-hover:from-blue-600/20 group-hover:to-purple-600/20 transition-colors duration-300">
              <Image 
                src={img} 
                alt={title} 
                width={24} 
                height={24} 
                className="transform transition-transform duration-300 group-hover:scale-110" 
              />
            </div>
            {badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {badge}
              </span>
            )}
          </div>
          
          {stats && (
            <div className="flex gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-right">
                  <p className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-blue-400 group-hover:to-purple-400 transition-colors duration-300">
              {title}
            </h3>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">
              {description}
            </p>
          </div>

          {features && features.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 text-sm text-gray-400"
                >
                  <div className="size-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-400 transition-colors duration-300" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </div>
    </motion.div>
  );
};

export default HomeCard;
