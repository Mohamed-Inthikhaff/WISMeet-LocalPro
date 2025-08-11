"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Users, Mail, X, ChevronDown, AlertCircle, CheckCircle } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../app/datepicker-custom.css";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (meetingData: MeetingData) => void;
}

interface MeetingData {
  title: string;
  guests: string[];
  date: Date;
  time: Date;
  timezone: string;
  notificationTime: number;
  description: string;
}

interface EmailValidation {
  isValid: boolean;
  message: string;
}

const timeZones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
];

const notificationOptions = [
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
];

const ScheduleMeetingModal = ({ isOpen, onClose, onSchedule }: ScheduleMeetingModalProps) => {
  const [formData, setFormData] = useState<MeetingData>({
    title: "",
    guests: [],
    date: new Date(),
    time: new Date(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notificationTime: 15,
    description: "",
  });

  const [guestEmail, setGuestEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailValidation, setEmailValidation] = useState<EmailValidation>({
    isValid: true,
    message: "",
  });
  const [isSendingInvitations, setIsSendingInvitations] = useState(false);

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Add guest email
  const addGuest = () => {
    if (!guestEmail.trim()) {
      setEmailValidation({
        isValid: false,
        message: "Please enter an email address",
      });
      return;
    }

    if (!validateEmail(guestEmail)) {
      setEmailValidation({
        isValid: false,
        message: "Please enter a valid email address",
      });
      return;
    }

    if (formData.guests.includes(guestEmail)) {
      setEmailValidation({
        isValid: false,
        message: "This email is already added",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      guests: [...prev.guests, guestEmail.trim()],
    }));
    setGuestEmail("");
    setEmailValidation({ isValid: true, message: "" });
  };

  // Remove guest email
  const removeGuest = (email: string) => {
    setFormData(prev => ({
      ...prev,
      guests: prev.guests.filter(g => g !== email),
    }));
  };

  // Handle form submission
  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    if (!formData.title.trim()) {
      newErrors.title = "Meeting title is required";
    }

    if (formData.guests.length === 0) {
      newErrors.guests = "At least one guest is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    if (!formData.time) {
      newErrors.time = "Time is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSendingInvitations(true);
      onSchedule(formData);
      // Note: onClose will be called after the meeting is created and invitations are sent
    }
  };

  // Handle key press for email input
  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addGuest();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] border-none bg-transparent p-0 max-w-2xl w-full mx-4">
        <DialogTitle className="sr-only">Schedule a Meeting</DialogTitle>
        <DialogDescription className="sr-only">
          Schedule a new meeting with guests, date, time, and notification settings
        </DialogDescription>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            "relative w-full overflow-hidden rounded-3xl",
            "bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-xl",
            "p-8 text-white shadow-2xl max-h-[90vh] overflow-y-auto"
          )}
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
          <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-blue-500/10 blur-[100px] rounded-full" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-purple-500/10 blur-[100px] rounded-full" />
          
          <div className="relative z-10">
            {/* Header */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                Schedule a Meeting
              </h2>
              <p className="text-gray-400 text-center">
                Create a new meeting with guests and notification settings
              </p>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Meeting Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white font-medium">
                  Meeting Title *
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter meeting title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={cn(
                    "bg-gray-800/50 border-gray-600 text-white placeholder-gray-400",
                    "focus:border-blue-500 focus:ring-blue-500/20",
                    errors.title && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
                {errors.title && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm flex items-center gap-1"
                  >
                    <AlertCircle className="h-4 w-4" />
                    {errors.title}
                  </motion.p>
                )}
              </div>

              {/* Invite Guests */}
              <div className="space-y-2">
                <Label className="text-white font-medium">
                  Invite Guests *
                </Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter guest email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      onKeyPress={handleEmailKeyPress}
                      className={cn(
                        "bg-gray-800/50 border-gray-600 text-white placeholder-gray-400",
                        "focus:border-blue-500 focus:ring-blue-500/20",
                        !emailValidation.isValid && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      )}
                    />
                    <Button
                      type="button"
                      onClick={addGuest}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {!emailValidation.isValid && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm flex items-center gap-1"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {emailValidation.message}
                    </motion.p>
                  )}

                  {/* Guest List */}
                  <AnimatePresence>
                    {formData.guests.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <p className="text-sm text-gray-400">Added guests:</p>
                        <div className="space-y-2">
                          {formData.guests.map((email, index) => (
                            <motion.div
                              key={email}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-blue-400" />
                                <span className="text-white">{email}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGuest(email)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {errors.guests && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm flex items-center gap-1"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {errors.guests}
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">
                    Date *
                  </Label>
                  <div className="relative">
                    <DatePicker
                      selected={formData.date}
                      onChange={(date) => setFormData(prev => ({ ...prev, date: date || new Date() }))}
                      dateFormat="MMMM d, yyyy"
                      minDate={new Date()}
                      className={cn(
                        "w-full bg-gray-800/50 border border-gray-600 text-white rounded-md px-3 py-2",
                        "focus:border-blue-500 focus:ring-blue-500/20 focus:outline-none",
                        errors.date && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      )}
                      placeholderText="Select date"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.date && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm flex items-center gap-1"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {errors.date}
                    </motion.p>
                  )}
                </div>

                {/* Time Picker */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">
                    Time *
                  </Label>
                  <div className="relative">
                    <DatePicker
                      selected={formData.time}
                      onChange={(time) => setFormData(prev => ({ ...prev, time: time || new Date() }))}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="h:mm aa"
                      className={cn(
                        "w-full bg-gray-800/50 border border-gray-600 text-white rounded-md px-3 py-2",
                        "focus:border-blue-500 focus:ring-blue-500/20 focus:outline-none",
                        errors.time && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      )}
                      placeholderText="Select time"
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.time && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm flex items-center gap-1"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {errors.time}
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Timezone and Notification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timezone */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">
                    Timezone
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
                      >
                        <span>
                          {timeZones.find(tz => tz.value === formData.timezone)?.label || formData.timezone}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-600 max-h-60 overflow-y-auto">
                      {timeZones.map((timezone) => (
                        <DropdownMenuItem
                          key={timezone.value}
                          onClick={() => setFormData(prev => ({ ...prev, timezone: timezone.value }))}
                          className="text-white hover:bg-gray-700 cursor-pointer"
                        >
                          {timezone.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Notification */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">
                    Notification
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
                      >
                        <span>
                          {notificationOptions.find(opt => opt.value === formData.notificationTime)?.label}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-600">
                      {notificationOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setFormData(prev => ({ ...prev, notificationTime: option.value }))}
                          className="text-white hover:bg-gray-700 cursor-pointer"
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter meeting description, agenda, or any additional details..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 min-h-[100px]"
                />
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex gap-3 mt-8"
            >
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSendingInvitations}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingInvitations ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending Invitations...
                  </div>
                ) : (
                  "Schedule Meeting"
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleMeetingModal; 