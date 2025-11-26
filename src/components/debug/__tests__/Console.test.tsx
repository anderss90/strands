import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Console from '../Console';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Console', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    // Mock scrollIntoView for jsdom
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('renders console component correctly', () => {
    render(<Console />);
    
    expect(screen.getByText('Console')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Changelog')).toBeInTheDocument();
  });

  it('displays empty state when no messages', () => {
    render(<Console />);
    
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it('navigates to changelog when button is clicked', () => {
    render(<Console />);
    
    const changelogButton = screen.getByText('Changelog');
    fireEvent.click(changelogButton);
    
    expect(mockPush).toHaveBeenCalledWith('/console/changelog');
  });

  it('loads messages from localStorage on mount', () => {
    const mockMessages = [
      {
        id: '1',
        type: 'log',
        message: 'Test message',
        timestamp: new Date().toISOString(),
      },
    ];
    
    (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockMessages));
    
    render(<Console />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('clears messages when clear button is clicked', () => {
    const mockMessages = [
      {
        id: '1',
        type: 'log',
        message: 'Test message',
        timestamp: new Date().toISOString(),
      },
    ];
    
    (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockMessages));
    
    render(<Console />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('console_messages');
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it('toggles auto-scroll checkbox', () => {
    render(<Console />);
    
    const checkbox = screen.getByLabelText(/auto-scroll/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
    
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('displays message statistics in footer', () => {
    const mockMessages = [
      {
        id: '1',
        type: 'error',
        message: 'Error message',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'warn',
        message: 'Warning message',
        timestamp: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'log',
        message: 'Log message',
        timestamp: new Date().toISOString(),
      },
    ];
    
    (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockMessages));
    
    render(<Console />);
    
    expect(screen.getByText(/total messages: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/errors: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/warnings: 1/i)).toBeInTheDocument();
  });
});

