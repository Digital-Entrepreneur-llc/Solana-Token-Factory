type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationOptions {
  type?: NotificationType;
  message: string;
  description?: string;
  duration?: number;
}

export const notify = ({ type = 'info', message, description }: NotificationOptions) => {
  // For now, just console log the notification
  // You can enhance this with a proper notification system later
  // Note: duration parameter is available in NotificationOptions for future use with toast systems
  console.log(`[${type.toUpperCase()}] ${message}${description ? `: ${description}` : ''}`);
}; 