import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upcoming Meetings | WISMeet',
  description: 'View and manage all your upcoming scheduled meetings',
};

export default function UpcomingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 