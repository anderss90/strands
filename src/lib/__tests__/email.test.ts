// Mock Resend before importing email module
const mockSend = jest.fn();
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  };
});

describe('Email Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockClear();
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test-api-key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      // Re-import to get fresh module with mocked Resend
      const { sendPasswordResetEmail } = await import('../email');
      
      mockSend.mockResolvedValue({ id: 'email-id' });

      await sendPasswordResetEmail('test@example.com', 'reset-token-123');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toBe('Reset Your Password');
      expect(callArgs.html).toContain('reset-token-123');
      expect(callArgs.html).toContain('http://localhost:3000/reset-password?token=reset-token-123');
      expect(callArgs.text).toContain('reset-token-123');
    });

    it('should throw error when Resend API key is not configured', async () => {
      process.env.RESEND_API_KEY = '';
      
      // Re-import to get fresh module
      const { sendPasswordResetEmail } = await import('../email');

      await expect(
        sendPasswordResetEmail('test@example.com', 'reset-token-123')
      ).rejects.toThrow('Resend API key is not configured');
    });

    it('should throw error when email sending fails', async () => {
      // Re-import to get fresh module
      const { sendPasswordResetEmail } = await import('../email');
      
      mockSend.mockRejectedValue(new Error('Email service error'));

      await expect(
        sendPasswordResetEmail('test@example.com', 'reset-token-123')
      ).rejects.toThrow('Failed to send password reset email');
    });

    it('should use NEXTAUTH_URL as fallback for app URL', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXTAUTH_URL = 'http://fallback:3000';

      // Re-import to get new env values
      const { sendPasswordResetEmail } = await import('../email');
      
      mockSend.mockResolvedValue({ id: 'email-id' });

      await sendPasswordResetEmail('test@example.com', 'reset-token-123');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('http://fallback:3000/reset-password?token=reset-token-123');
    });
  });
});
