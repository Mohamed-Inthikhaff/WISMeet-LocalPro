"use client";
import { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import Image from "next/image";
import { motion, AnimatePresence } from 'framer-motion';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  children?: ReactNode;
  handleClick?: () => void;
  buttonText?: string;
  instantMeeting?: boolean;
  image?: string;
  buttonIcon?: string;
  buttonClassName?: string;
  description?: string;
}

const MeetingModal = ({
  isOpen,
  onClose,
  title,
  className,
  children,
  handleClick,
  buttonText,
  instantMeeting,
  image,
  buttonIcon,
  buttonClassName,
  description,
}: MeetingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] border-none bg-transparent p-0"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <DialogTitle id="modal-title" className="sr-only">{title}</DialogTitle>
        {description && (
          <DialogDescription id="modal-description" className="sr-only">{description}</DialogDescription>
        )}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            "relative w-full max-w-[600px] overflow-hidden rounded-3xl",
            "bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-xl",
            "p-8 text-white shadow-2xl"
          )}
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
          <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-blue-500/10 blur-[100px] rounded-full" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-purple-500/10 blur-[100px] rounded-full" />
          
          {/* Close Button - Always Visible */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="mb-8">
              {image && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 flex justify-center"
                >
                  <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-4">
                    <Image src={image} alt="modal icon" width={72} height={72} className="transform transition-all duration-300 hover:scale-110" />
                  </div>
                </motion.div>
              )}
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3 text-center"
              >
                <h2 
                  id="modal-title"
                  className={cn(
                    "text-3xl font-bold leading-tight",
                    "bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent",
                    className
                  )}
                >
                  {title}
                </h2>
                {description && (
                  <p id="modal-description" className="text-gray-400">{description}</p>
                )}
              </motion.div>
            </div>

            {/* Content */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              {children}

              {/* Action Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  className={cn(
                    "w-full bg-gradient-to-r from-blue-500 to-purple-600",
                    "hover:from-blue-600 hover:to-purple-700",
                    "text-white font-medium py-6 rounded-xl",
                    "transform transition-all duration-300",
                    "hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]",
                    "active:scale-[0.98]",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                    buttonClassName
                  )}
                  onClick={handleClick}
                >
                  <div className="flex items-center justify-center gap-2">
                    {buttonIcon && (
                      <Image
                        src={buttonIcon}
                        alt="button icon"
                        width={18}
                        height={18}
                        className="opacity-90"
                      />
                    )}
                    <span className="text-lg font-medium">
                      {buttonText || "Schedule Meeting"}
                    </span>
                  </div>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingModal;
