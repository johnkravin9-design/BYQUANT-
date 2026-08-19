export interface NotificationRegistrationResult {
  enabled: boolean;
  token?: string;
  reason?: string;
}

export const requestNotificationRegistration = async (): Promise<NotificationRegistrationResult> => ({
  enabled: false,
  reason: 'Firebase Cloud Messaging is not configured in this React Native project yet.',
});

export const sendNotificationTokenToBackend = async (_token: string): Promise<void> => {
  throw new Error('Notification token synchronization requires authenticated backend support.');
};
