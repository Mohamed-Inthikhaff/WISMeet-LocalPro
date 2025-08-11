'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  MessageSquare, 
  Calendar, 
  Users, 
  ArrowRight,
  Clock,
  Star,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';

interface ChatHistoryMeeting {
  _id: string;
  meetingId: string;
  title: string;
  hostId: string;
  participants: string[];
  startTime: string;
  messageCount: number;
  lastMessage?: {
    message: string;
    senderName: string;
    timestamp: string;
  };
  hasMessages: boolean;
}

interface ChatHistoryResponse {
  meetings: ChatHistoryMeeting[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    search: string;
    sortBy: string;
    filterBy: string;
  };
}

const ChatHistoryPage = () => {
  const [meetings, setMeetings] = useState<ChatHistoryMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const fetchChatHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: search,
        sortBy: sortBy,
        filterBy: filterBy
      });

      const response = await fetch(`/api/chat/history?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }

      const data: ChatHistoryResponse = await response.json();
      setMeetings(data.meetings);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, sortBy, filterBy]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const getSortIcon = () => {
    switch (sortBy) {
      case 'recent':
        return <SortDesc className="w-4 h-4" />;
      case 'oldest':
        return <SortAsc className="w-4 h-4" />;
      case 'mostMessages':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <SortDesc className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f1620] to-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10">
        <div className="px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="p-2 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Chat History
                </h1>
                <p className="text-gray-400">Browse and search your meeting conversations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {pagination?.total || 0} meetings
              </span>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 mb-8"
          >
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search meetings or messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-10 pr-8 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="mostMessages">Most Messages</option>
              </select>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                {getSortIcon()}
              </div>
            </div>

            {/* Filter */}
            <div className="relative">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="appearance-none pl-10 pr-8 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
              >
                <option value="all">All Meetings</option>
                <option value="withMessages">With Messages</option>
                <option value="withoutMessages">Without Messages</option>
              </select>
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </motion.div>

          {/* Meetings Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="h-48 bg-gray-800/30 rounded-2xl border border-gray-700/30 animate-pulse"
                />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-white mb-2">No meetings found</h3>
              <p className="text-gray-400">
                {search ? 'Try adjusting your search terms' : 'Start a meeting to see chat history here'}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {meetings.map((meeting, index) => (
                  <motion.div
                    key={meeting.meetingId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 backdrop-blur-xl shadow-xl hover:shadow-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-lg mb-1 line-clamp-2">
                            {meeting.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDistanceToNow(new Date(meeting.startTime), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {meeting.hasMessages && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {meeting.messageCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Last Message Preview */}
                      {meeting.lastMessage && (
                        <div className="mb-4 p-3 bg-gray-800/30 rounded-xl border border-gray-700/30">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-medium">
                              {meeting.lastMessage.senderName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-white">
                              {meeting.lastMessage.senderName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(meeting.lastMessage.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 line-clamp-2">
                            {meeting.lastMessage.message}
                          </p>
                        </div>
                      )}

                      {/* Participants */}
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {meeting.participants.length} participants
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <Link 
                          href={`/meetings/${meeting.meetingId}/chat`}
                          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                        >
                          <MessageSquare className="w-4 h-4" />
                          View Chat
                        </Link>
                        {meeting.hasMessages && (
                          <span className="text-sm text-gray-400">
                            {meeting.messageCount} messages
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 mt-8"
            >
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800/70 transition-all duration-300"
              >
                Previous
              </button>
              
              <span className="px-4 py-2 text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800/70 transition-all duration-300"
              >
                Next
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistoryPage; 