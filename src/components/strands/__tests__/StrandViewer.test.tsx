import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import StrandViewer from '../StrandViewer';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.history
const mockPushState = jest.fn();
const mockReplaceState = jest.fn();
const mockBack = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, 'history', {
    value: {
      pushState: mockPushState,
      replaceState: mockReplaceState,
      back: mockBack,
      state: null,
    },
    writable: true,
  });
});

describe('StrandViewer', () => {
  const mockPush = jest.fn();
  const mockOnClose = jest.fn();
  const mockUser = {
    id: 'user1',
    username: 'testuser',
    displayName: 'Test User',
    isAdmin: false,
  };

  const mockStrand = {
    id: 'strand1',
    userId: 'user1',
    content: 'Test strand content',
    createdAt: new Date().toISOString(),
    hasUserFired: false,
    fireCount: 0,
    user: {
      id: 'user1',
      username: 'testuser',
      displayName: 'Test User',
    },
    groups: [],
  };

  const mockComments = {
    comments: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (usePathname as jest.Mock).mockReturnValue('/home');
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/strands/') && !url.includes('/comments')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockStrand,
        });
      }
      if (url.includes('/comments')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockComments,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    mockPushState.mockClear();
    mockReplaceState.mockClear();
    mockBack.mockClear();
  });

  it('renders loading state initially', () => {
    render(<StrandViewer strandId="strand1" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches and displays strand data', async () => {
    render(<StrandViewer strandId="strand1" />);

    await waitFor(() => {
      expect(screen.getByText('Test strand content')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    render(<StrandViewer strandId="strand1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Test strand content')).toBeInTheDocument();
    });

    // Find the close button by its SVG path (back arrow)
    const closeButton = screen.getAllByRole('button')[0];
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('pushes history state when viewer opens', async () => {
    render(<StrandViewer strandId="strand1" />);

    await waitFor(() => {
      expect(screen.getByText('Test strand content')).toBeInTheDocument();
    });

    expect(mockPushState).toHaveBeenCalledWith(
      { strandViewer: true, strandId: 'strand1' },
      '',
      expect.any(String)
    );
  });

  it('intercepts browser back button and calls onClose', async () => {
    render(<StrandViewer strandId="strand1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Test strand content')).toBeInTheDocument();
    });

    // Simulate browser back button (popstate event)
    const popStateEvent = new PopStateEvent('popstate', {
      state: null,
    });
    window.dispatchEvent(popStateEvent);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });

    // When on /home, we navigate to /home and don't push state back
    // So pushState is only called once (on mount)
    expect(mockPushState).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('navigates to home when onClose is not provided and back is pressed', async () => {
    render(<StrandViewer strandId="strand1" />);

    await waitFor(() => {
      expect(screen.getByText('Test strand content')).toBeInTheDocument();
    });

    // Simulate browser back button
    const popStateEvent = new PopStateEvent('popstate', {
      state: null,
    });
    window.dispatchEvent(popStateEvent);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  it('navigates to group page when pathname includes groups', async () => {
    (usePathname as jest.Mock).mockReturnValue('/groups/group1');
    
    render(<StrandViewer strandId="strand1" />);

    await waitFor(() => {
      expect(screen.getByText('Test strand content')).toBeInTheDocument();
    });

    // Simulate browser back button
    const popStateEvent = new PopStateEvent('popstate', {
      state: null,
    });
    window.dispatchEvent(popStateEvent);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/groups/group1');
    });
  });

  it('cleans up history state when component unmounts via close button', async () => {
    const { unmount } = render(<StrandViewer strandId="strand1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Test strand content')).toBeInTheDocument();
    });

    // Set history state to simulate the state we pushed
    window.history.state = { strandViewer: true, strandId: 'strand1' };

    // Close via close button (unmount)
    const closeButton = screen.getAllByRole('button')[0];
    fireEvent.click(closeButton);

    unmount();

    // Should replace state to clean up
    expect(mockReplaceState).toHaveBeenCalled();
  });

  it('displays error message when strand fails to load', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/strands/') && !url.includes('/comments')) {
        return Promise.resolve({
          ok: false,
          status: 404,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<StrandViewer strandId="strand1" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load strand/i)).toBeInTheDocument();
    });
  });

  it('handles comment submission', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/strands/') && !url.includes('/comments')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockStrand,
        });
      }
      if (url.includes('/comments') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'comment1',
            content: 'New comment',
            userId: 'user1',
            createdAt: new Date().toISOString(),
            user: mockUser,
          }),
        });
      }
      if (url.includes('/comments') && !options) {
        return Promise.resolve({
          ok: true,
          json: async () => mockComments,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<StrandViewer strandId="strand1" />);

    await waitFor(() => {
      expect(screen.getByText('Test strand content')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/write a comment/i);
    fireEvent.change(textarea, { target: { value: 'New comment' } });

    const submitButton = screen.getByRole('button', { name: /post/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New comment')).toBeInTheDocument();
    });
  });
});

