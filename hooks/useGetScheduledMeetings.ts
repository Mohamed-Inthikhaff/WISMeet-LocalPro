'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface ScheduledMeeting {
  _id: string;
  meetingId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  hostId: string;
  participants: string[];
  status: 'scheduled' | 'active' | 'ended';
  createdAt: string;
  updatedAt: string;
}

export const useGetScheduledMeetings = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScheduledMeetings = async () => {
      if (!isUserLoaded || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch('/api/meetings/scheduled?status=scheduled');
        const data = await response.json();
        
        if (data.success) {
          // Filter out past meetings on the client side as well
          const now = new Date();
          const futureMeetings = data.meetings.filter((meeting: ScheduledMeeting) => {
            const meetingStartTime = new Date(meeting.startTime);
            return meetingStartTime > now;
          });
          
          setScheduledMeetings(futureMeetings);
        } else {
          console.error('Error fetching scheduled meetings:', data.error);
        }
      } catch (error) {
        console.error('Error fetching scheduled meetings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduledMeetings();

    // Set up periodic refresh every 30 seconds
    const intervalId = setInterval(fetchScheduledMeetings, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, isUserLoaded]);

  return {
    scheduledMeetings,
    isLoading,
  };
}; 