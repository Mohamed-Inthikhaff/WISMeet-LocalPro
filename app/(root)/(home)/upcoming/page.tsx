'use client';

import { motion } from 'framer-motion';
import { useGetScheduledMeetings } from '@/hooks/useGetScheduledMeetings';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { getMeetingLink } from '@/lib/utils';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

const LoadingSpinner = () => (
  <div className="flex items-center gap-2 text-gray-400">
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    <span>Loading...</span>
  </div>
);

const UpcomingMeetings = () => {
  const { scheduledMeetings, isLoading } = useGetScheduledMeetings();
  const { user } = useUser();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6 lg:p-8 space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Upcoming Meetings
          </h1>
          <p className="text-sm text-gray-400">All your scheduled meetings</p>
        </div>
        
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 transition-colors"
        >
          Back
        </button>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : scheduledMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-gray-800/50 rounded-full p-4 mb-4">
              <Image
                src="/icons/schedule.svg"
                alt="No meetings"
                width={32}
                height={32}
                className="opacity-50"
              />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Meetings</h3>
            <p className="text-gray-400 text-center mb-6">
              You don&apos;t have any meetings scheduled. Would you like to schedule one now?
            </p>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Schedule a Meeting
            </Link>
          </div>
        ) : (
          scheduledMeetings.map((meeting, index) => (
            <motion.div
              key={meeting._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-xl bg-gray-800/50 p-6 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {meeting.title || 'Scheduled Meeting'}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                          />
                        </svg>
                        <span>{format(new Date(meeting.startTime), 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                          />
                        </svg>
                        <span>{format(new Date(meeting.startTime), 'h:mm a')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((_, i) => (
                        <div
                          key={i}
                          className="size-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      ))}
                    </div>
                    <span className="text-sm text-gray-400">
                      {meeting.participants?.length || 0} Participants
                    </span>
                    <span className="text-sm text-gray-400">
                      • Hosted by {meeting.hostId === user?.id ? 'You' : 'Other'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Link 
                    href={`/meeting/${meeting.meetingId}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
                      />
                    </svg>
                    Join Meeting
                  </Link>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(getMeetingLink(meeting.meetingId));
                      // You might want to add a toast notification here
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" 
                      />
                    </svg>
                    Copy Link
                  </button>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default UpcomingMeetings;
