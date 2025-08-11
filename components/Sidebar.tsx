'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { sidebarLinks } from '@/constants';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <motion.section 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="sticky left-0 top-0 flex h-screen w-fit flex-col justify-between bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-xl border-r border-gray-800/50 p-6 pt-28 text-white max-sm:hidden lg:w-[280px]"
    >
      <div className="flex flex-1 flex-col gap-3">
        {sidebarLinks.map((item, index) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
          
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={item.route}
                className={cn(
                  'group flex items-center gap-3 rounded-xl p-3 transition-all duration-300',
                  'hover:bg-gray-800/50',
                  {
                    'bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30': isActive,
                  }
                )}
              >
                <div className={cn(
                  'flex items-center justify-center size-10 rounded-lg transition-all duration-300',
                  'bg-gray-800/50 group-hover:bg-gray-700/50',
                  { 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 group-hover:from-blue-600/30 group-hover:to-purple-600/30': isActive }
                )}>
                  <Image
                    src={item.imgURL}
                    alt={item.label}
                    width={20}
                    height={20}
                    className={cn(
                      'opacity-70 transition-all duration-300 group-hover:opacity-100',
                      { 'opacity-100': isActive }
                    )}
                  />
                </div>

                <div className="flex-1 max-lg:hidden">
                  <p className={cn(
                    'text-sm font-medium transition-colors duration-300',
                    'text-gray-400 group-hover:text-white',
                    { 'text-white': isActive }
                  )}>
                    {item.label}
                  </p>
                  <p className={cn(
                    'text-xs transition-colors duration-300',
                    'text-gray-500 group-hover:text-gray-400',
                    { 'text-gray-400': isActive }
                  )}>
                    {item.description}
                  </p>
                </div>

                {isActive && (
                  <div className="size-1.5 rounded-full bg-blue-500 max-lg:hidden" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Pro Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 rounded-xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-4 max-lg:hidden"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-sm">⭐️</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">WISMeet Pro</p>
            <p className="text-xs text-gray-400">Unlock all features</p>
          </div>
        </div>
        <button className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
          Upgrade Now
        </button>
      </motion.div>
    </motion.section>
  );
};

export default Sidebar;
