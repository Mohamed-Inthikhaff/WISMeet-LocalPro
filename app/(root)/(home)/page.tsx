'use client';

import { motion, AnimatePresence } from 'framer-motion';
import MeetingTypeList from '@/components/MeetingTypeList';
import Image from 'next/image';
import { useGetCalls } from '@/hooks/useGetCalls';
import { useGetScheduledMeetings } from '@/hooks/useGetScheduledMeetings';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { getMeetingLink } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Users, 
  Video, 
  Mic, 
  Calendar, 
  MessageSquare, 
  Play, 
  Share2, 
  Copy, 
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Activity,
  Star,
  TrendingUp
} from 'lucide-react';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" style={{ animationDelay: '-0.5s' }}></div>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, value, label, trend, className }: any) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border border-gray-700/30 backdrop-blur-xl",
      className
    )}
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-green-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {value}
        </div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  </motion.div>
);

const FeatureCard = ({ icon: Icon, title, description, gradient }: any) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border border-gray-700/30 backdrop-blur-xl hover:border-gray-600/50 transition-all duration-300"
  >
    <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
    <div className="relative z-10">
      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 mb-4 w-fit">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const Home = () => {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = (new Intl.DateTimeFormat('en-US', { dateStyle: 'full' })).format(now);
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const [isClient, setIsClient] = useState(false);
  
  // State for chat history
  const [chatHistory, setChatHistory] = useState<any>(null);
  const [chatLoading, setChatLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch chat history
  const fetchChatHistory = useCallback(async () => {
    try {
      setChatLoading(true);
      const response = await fetch('/api/chat/history?limit=1&sortBy=recent');
      const data = await response.json();
      setChatHistory(data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setChatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchChatHistory();
    }
  }, [isSignedIn, fetchChatHistory]);

  const { upcomingCalls, callRecordings, isLoading } = useGetCalls();
  const { scheduledMeetings, isLoading: scheduledLoading } = useGetScheduledMeetings();

  // Show loading state while user authentication is being checked
  if (!isClient || !isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f1620] to-black text-white">
        <LoadingSpinner />
      </div>
    );
  }

  // Show sign-in message if user is not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f1620] to-black text-white flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 mx-auto mb-4">
              <div className="h-full w-full rounded-2xl bg-gray-900 flex items-center justify-center">
                <Image src="/icons/logo.svg" alt="Logo" width={32} height={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
              Welcome to WISMeet Pro
            </h2>
            <p className="text-gray-400">Please sign in to access your enterprise-grade video conferencing platform.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f1620] to-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="px-6 lg:px-8 py-8">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between mb-12"
          >
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-2xl"
              >
                <div className="h-full w-full rounded-2xl bg-gray-900 flex items-center justify-center">
                  <Image src="/icons/logo.svg" alt="Logo" width={32} height={32} className="text-white" />
                </div>
              </motion.div>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  WISMeet Enterprise
                </h1>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Enterprise-Grade Video Conferencing
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Premium Status Badge */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl rounded-full px-4 py-2 border border-yellow-500/30"
              >
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Premium</span>
              </motion.div>

              {/* System Status */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 bg-gray-800/30 backdrop-blur-xl rounded-full px-6 py-3 border border-gray-700/30 shadow-xl"
              >
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                <span className="text-sm font-medium text-gray-300">System Online</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </motion.div>
            </div>
          </motion.div>

          {/* Hero Section */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="relative mb-16"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-xl"></div>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full"></div>
              
              <div className="relative p-8 lg:p-12">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full px-6 py-3 border border-blue-500/20 backdrop-blur-xl"
                      >
                        <Zap className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                          Enterprise-Grade Performance
                        </span>
                      </motion.div>
                      
                      <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-5xl lg:text-6xl font-bold leading-tight"
                      >
                        Connect with{' '}
                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                          Crystal Clear
                        </span>{' '}
                        Quality
                      </motion.h2>
                      
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-xl text-gray-300 leading-relaxed"
                      >
                        Experience seamless video meetings with enterprise-grade security, 
                        crystal clear audio, and advanced collaboration tools designed for modern teams.
                      </motion.p>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      {[
                        { icon: Shield, label: 'End-to-End Encryption', color: 'from-green-500 to-emerald-500' },
                        { icon: Video, label: '4K Video Quality', color: 'from-blue-500 to-cyan-500' },
                        { icon: Mic, label: 'AI Noise Cancellation', color: 'from-purple-500 to-pink-500' },
                        { icon: Users, label: 'Unlimited Participants', color: 'from-orange-500 to-red-500' },
                      ].map((feature, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${feature.color} bg-opacity-20`}>
                            <feature.icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm text-gray-300 font-medium">{feature.label}</span>
                        </div>
                      ))}
                    </motion.div>
                  </div>

                  <div className="relative">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7, duration: 0.8 }}
                      className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-3xl p-8 border border-gray-700/50 backdrop-blur-xl shadow-2xl"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="space-y-2">
                          <div className="text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {time}
                          </div>
                          <div className="text-gray-400 text-lg">{date}</div>
                        </div>
                        <div className="flex items-center gap-3 bg-green-500/20 text-green-400 rounded-full px-6 py-3 border border-green-500/30">
                          <div className="size-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                          <span className="text-sm font-medium">Ready to Connect</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {[
                          { label: 'Active Users', value: '2.4k+', icon: Users, color: 'from-blue-500 to-cyan-500' },
                          { label: 'Meetings Today', value: '186', icon: Calendar, color: 'from-purple-500 to-pink-500' },
                          { label: 'Uptime', value: '99.9%', icon: BarChart3, color: 'from-green-500 to-emerald-500' },
                          { label: 'Bandwidth', value: 'Ultra HD', icon: Zap, color: 'from-orange-500 to-red-500' },
                        ].map((stat, index) => (
                          <motion.div 
                            key={index}
                            whileHover={{ scale: 1.05, y: -2 }}
                            className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/30"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} bg-opacity-20`}>
                                <stat.icon className="w-4 h-4 text-white" />
                              </div>
                              <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                {stat.value}
                              </div>
                            </div>
                            <div className="text-sm text-gray-400">{stat.label}</div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Premium Stats Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                icon={Users} 
                value="2.4k+" 
                label="Active Users" 
                trend="+12%"
                className="from-blue-500/10 to-cyan-500/10"
              />
              <StatCard 
                icon={Calendar} 
                value="186" 
                label="Meetings Today" 
                trend="+8%"
                className="from-purple-500/10 to-pink-500/10"
              />
              <StatCard 
                icon={BarChart3} 
                value="99.9%" 
                label="Uptime" 
                trend="+0.1%"
                className="from-green-500/10 to-emerald-500/10"
              />
              <StatCard 
                icon={Zap} 
                value="Ultra HD" 
                label="Bandwidth" 
                trend="+15%"
                className="from-orange-500/10 to-red-500/10"
              />
            </div>
          </motion.div>

          {/* Quick Actions Section */}
          <section className="px-6 lg:px-8 py-8 space-y-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-between"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Quick Actions
                </h3>
                <p className="text-lg text-gray-400">Start or join meetings with enterprise-grade quality</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 backdrop-blur-xl">
                  <div className="size-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                  <span className="text-sm text-gray-300 font-medium">Network: Excellent</span>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium 
                    hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300
                    flex items-center gap-3 backdrop-blur-xl"
                >
                  <span>View All</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
            
            <MeetingTypeList />

            {/* Upcoming Meetings Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-white">Upcoming Meetings</h3>
                    {scheduledMeetings && scheduledMeetings.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        {scheduledMeetings.length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">Your scheduled meetings</p>
                </div>
                <Link
                  href="/upcoming"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scheduledLoading ? (
                  <div className="col-span-full flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : scheduledMeetings?.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="col-span-full flex flex-col items-center justify-center py-16 px-4"
                  >
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl p-8 border border-gray-700/50 backdrop-blur-xl mb-6">
                      <Image
                        src="/icons/schedule.svg"
                        alt="No meetings"
                        width={48}
                        height={48}
                        className="opacity-50"
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">No Upcoming Meetings</h3>
                    <p className="text-gray-400 text-center mb-8 max-w-md">
                      You don&apos;t have any meetings scheduled. Would you like to schedule one now?
                    </p>
                    <Link
                      href="/"
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20"
                    >
                      Schedule a Meeting
                    </Link>
                  </motion.div>
                ) : (
                  scheduledMeetings?.slice(0, 3).map((meeting, index) => (
                    <motion.div
                      key={`scheduled-${meeting.meetingId}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 backdrop-blur-xl shadow-xl hover:shadow-2xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                          <div className="space-y-2">
                            <h5 className="font-semibold text-white text-lg">
                              {meeting.title}
                            </h5>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {format(new Date(meeting.startTime), 'EEEE, MMMM d, yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {format(new Date(meeting.startTime), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              Scheduled
                            </span>
                          </div>
                        </div>

                        {meeting.description && (
                          <p className="text-sm text-gray-300 mb-6 line-clamp-2">
                            {meeting.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mb-6">
                          <div className="flex -space-x-2">
                            {[1, 2, 3].map((_, i) => (
                              <div
                                key={i}
                                className="size-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-gray-800 flex items-center justify-center"
                              >
                                <Users className="w-4 h-4 text-gray-400" />
                              </div>
                            ))}
                          </div>
                          <span className="text-sm text-gray-400">
                            {meeting.participants.length} Participants
                          </span>
                          <span className="text-sm text-gray-400">
                            • Hosted by {meeting.hostId === user?.id ? 'You' : 'Other'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <Link 
                            href={`/meeting/${meeting.meetingId}`}
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                          >
                            <Video className="w-4 h-4" />
                            Join Meeting
                          </Link>
                          <Link
                            href={`/meetings/${meeting.meetingId}/chat`}
                            className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Chat History
                          </Link>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(getMeetingLink(meeting.meetingId));
                            }}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </button>
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>


            {/* Chat History Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 border border-gray-700/50 backdrop-blur-xl shadow-2xl mb-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Chat History
                  </h4>
                  <p className="text-gray-400">View messages from your recent meetings</p>
                </div>
                <Link 
                  href="/chat-history"
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300 backdrop-blur-xl"
                >
                  <span className="text-blue-400 font-medium">View All</span>
                  <ArrowRight className="w-5 h-5 text-blue-400" />
                </Link>
              </div>

              <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50">
                {chatLoading ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-700/50 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-700/30 rounded animate-pulse"></div>
                      </div>
                    </div>
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-700/50 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-700/30 rounded animate-pulse w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : chatHistory?.meetings?.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-white text-lg">
                          {chatHistory.meetings[0].title || 'Recent Meeting Chat'}
                        </h5>
                        <p className="text-sm text-gray-400">
                          {chatHistory.meetings[0].messageCount || 0} messages • {chatHistory.meetings[0].participants?.length || 0} participants
                        </p>
                      </div>
                    </div>
                    {chatHistory.meetings[0].lastMessage ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-xs text-white font-medium">
                            {chatHistory.meetings[0].lastMessage.senderName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white">
                                {chatHistory.meetings[0].lastMessage.senderName}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(chatHistory.meetings[0].lastMessage.timestamp).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300">
                              {chatHistory.meetings[0].lastMessage.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-400 text-sm">No messages yet</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-400 text-sm">No meetings with messages yet</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                                  <Link 
                  href="/chat-history"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
                >
                  View Full Chat History
                  <ArrowRight className="w-4 h-4" />
                </Link>
                </div>
              </div>
            </motion.div>

            {/* Recent Recordings Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 border border-gray-700/50 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Recent Recordings
                  </h4>
                  <p className="text-gray-400">Your latest meeting recordings</p>
                </div>
                <div className="flex items-center gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300 backdrop-blur-xl"
                  >
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-400 font-medium">Refresh</span>
                  </motion.button>
                  <Link 
                    href="/recordings"
                    className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300 backdrop-blur-xl"
                  >
                    <span className="text-blue-400 font-medium">View All</span>
                    <ArrowRight className="w-5 h-5 text-blue-400" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : callRecordings?.length === 0 ? (
                  <div className="col-span-full text-center text-gray-400 py-12">
                    <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No recordings available</p>
                  </div>
                ) : (
                  callRecordings?.slice(0, 3).map((recording, index) => (
                    <motion.div
                      key={recording.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 backdrop-blur-xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="space-y-2">
                            <h5 className="font-semibold text-white text-lg">
                              {(recording as any)._description || recording.state.custom?.description || 'Recorded Meeting'}
                            </h5>
                            <p className="text-sm text-gray-400">
                              {recording.state.endedAt && formatDistanceToNow(new Date(recording.state.endedAt), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              Recording
                            </span>
                            {(recording as any).recording_status && (
                              <span className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
                                (recording as any).recording_status === 'ready' || (recording as any).recording_status === 'completed'
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : (recording as any).recording_status === 'processing'
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              )}>
                                {(recording as any).recording_status}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {recording.state.recording && 
                           typeof recording.state.recording === 'object' && 
                           recording.state.recording !== null &&
                           'url' in recording.state.recording && 
                           typeof (recording.state.recording as any).url === 'string' && (
                            <a 
                              href={(recording.state.recording as any).url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                            >
                              <Play className="w-4 h-4" />
                              Watch Recording
                            </a>
                          )}
                          <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors">
                            <Share2 className="w-4 h-4" />
                            Share
                          </button>
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Home;
