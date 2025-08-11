'use client';

import { motion } from 'framer-motion';
import { useGetCalls } from '@/hooks/useGetCalls';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';

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

const PreviousMeetings = () => {
  const { endedCalls, isLoading } = useGetCalls();
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
            Previous Meetings
          </h1>
          <p className="text-sm text-gray-400">All your ended meetings</p>
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
        ) : endedCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-gray-800/50 rounded-full p-4 mb-4">
              <Image
                src="/icons/previous.svg"
                alt="No meetings"
                width={32}
                height={32}
                className="opacity-50"
              />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Previous Meetings</h3>
            <p className="text-gray-400 text-center mb-6">
              You don&apos;t have any ended meetings yet.
            </p>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Start a Meeting
            </Link>
          </div>
        ) : (
          endedCalls.map((meeting, index) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-xl bg-gray-800/50 p-6 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {(meeting as any)._description || meeting.state.custom?.description || 'Ended Meeting'}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                          />
                        </svg>
                        {(meeting as any)._startsAt ? (
                          <span>{format((meeting as any)._startsAt, 'EEEE, MMMM d, yyyy')}</span>
                        ) : meeting.state.endedAt ? (
                          <span>{format(new Date(meeting.state.endedAt), 'EEEE, MMMM d, yyyy')}</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                          />
                        </svg>
                        {(meeting as any)._startsAt ? (
                          <span>{format((meeting as any)._startsAt, 'h:mm a')}</span>
                        ) : meeting.state.endedAt ? (
                          <span>{format(new Date(meeting.state.endedAt), 'h:mm a')}</span>
                        ) : null}
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
                      {meeting.state.members?.length || 0} Participants
                    </span>
                    <span className="text-sm text-gray-400">
                      • Hosted by {meeting.state.createdBy?.id === user?.id ? 'You' : 'Other'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                    Ended
                  </span>
                  {meeting.state.recording && 
                    typeof meeting.state.recording === 'object' && 
                    meeting.state.recording !== null &&
                    'url' in meeting.state.recording && 
                    typeof (meeting.state.recording as any).url === 'string' && (
                     <a 
                       href={(meeting.state.recording as any).url}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                     >
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                           d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                         />
                       </svg>
                       View Recording
                     </a>
                   )}
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

export default PreviousMeetings;
