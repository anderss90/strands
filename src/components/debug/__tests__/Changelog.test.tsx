import { render, screen, waitFor } from '@testing-library/react';
import Changelog from '../Changelog';

// Mock fetch
global.fetch = jest.fn();

describe('Changelog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<Changelog />);
    
    expect(screen.getByText(/loading changelog/i)).toBeInTheDocument();
  });

  it('displays changelog entries when loaded', async () => {
    const mockEntries = [
      {
        hash: 'abc1234',
        date: '2024-01-15T10:30:00-05:00',
        message: 'Add new feature',
        author: 'Test User',
      },
      {
        hash: 'def5678',
        date: '2024-01-14T15:20:00-05:00',
        message: 'Fix bug in component',
        author: 'Another User',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ entries: mockEntries }),
    });

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.getByText('Add new feature')).toBeInTheDocument();
      expect(screen.getByText('Fix bug in component')).toBeInTheDocument();
    });

    expect(screen.getByText('abc1234')).toBeInTheDocument();
    expect(screen.getByText('def5678')).toBeInTheDocument();
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
  });

  it('displays error message when git is not available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        entries: [],
        error: 'Git log not available. This is normal in production environments.',
      }),
    });

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.getByText(/git log not available/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no entries are available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ entries: [] }),
    });

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.getByText(/no changelog entries available/i)).toBeInTheDocument();
    });
  });

  it('groups entries by date', async () => {
    const mockEntries = [
      {
        hash: 'abc1234',
        date: '2024-01-15T10:30:00-05:00',
        message: 'First commit',
        author: 'User 1',
      },
      {
        hash: 'def5678',
        date: '2024-01-15T14:20:00-05:00',
        message: 'Second commit',
        author: 'User 2',
      },
      {
        hash: 'ghi9012',
        date: '2024-01-14T09:15:00-05:00',
        message: 'Third commit',
        author: 'User 3',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ entries: mockEntries }),
    });

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.getByText('First commit')).toBeInTheDocument();
      expect(screen.getByText('Second commit')).toBeInTheDocument();
      expect(screen.getByText('Third commit')).toBeInTheDocument();
    });
  });

  it('displays entry count in footer', async () => {
    const mockEntries = [
      {
        hash: 'abc1234',
        date: '2024-01-15T10:30:00-05:00',
        message: 'Test commit',
        author: 'Test User',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ entries: mockEntries }),
    });

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.getByText(/showing 1 entry/i)).toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Changelog />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load changelog/i)).toBeInTheDocument();
    });
  });
});

