import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the dynamic base URL that works in both client and server environments
 * @returns The base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side: use window.location.origin
    return window.location.origin;
  }
  
  // Server-side: use environment variable
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

/**
 * Generate a meeting link with the correct base URL
 * @param meetingId - The meeting ID
 * @param personal - Whether this is a personal room
 * @returns The complete meeting URL
 */
export function getMeetingLink(meetingId: string, personal: boolean = false): string {
  const baseUrl = getBaseUrl();
  const queryParams = personal ? "?personal=true" : "";
  return `${baseUrl}/meeting/${meetingId}${queryParams}`;
}

/**
 * Sanitize a string to be used as a Stream call ID
 * Stream call IDs can only contain lowercase letters, numbers, hyphens, and underscores
 * @param title - The title to sanitize
 * @returns A sanitized string suitable for use as a call ID
 */
export function sanitizeCallId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-') // Replace invalid characters with hyphens
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading and trailing hyphens
    .substring(0, 50); // Limit length to 50 characters
}
