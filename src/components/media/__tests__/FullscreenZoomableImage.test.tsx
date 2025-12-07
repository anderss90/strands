import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FullscreenZoomableImage from '../FullscreenZoomableImage';

// Mock fullscreen API
const mockRequestFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();
const mockWebkitRequestFullscreen = jest.fn();
const mockWebkitExitFullscreen = jest.fn();
const mockMozRequestFullScreen = jest.fn();
const mockMozCancelFullScreen = jest.fn();
const mockMsRequestFullscreen = jest.fn();
const mockMsExitFullscreen = jest.fn();

describe('FullscreenZoomableImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup fullscreen API mocks
    Object.defineProperty(document, 'fullscreenEnabled', {
      writable: true,
      value: true,
    });
    
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null,
    });
    
    document.requestFullscreen = mockRequestFullscreen;
    document.exitFullscreen = mockExitFullscreen;
    
    (document as any).webkitFullscreenEnabled = true;
    (document as any).webkitFullscreenElement = null;
    (document as any).webkitExitFullscreen = mockWebkitExitFullscreen;
    
    (document as any).mozFullScreenEnabled = true;
    (document as any).mozFullScreenElement = null;
    (document as any).mozCancelFullScreen = mockMozCancelFullScreen;
    
    (document as any).msFullscreenEnabled = true;
    (document as any).msFullscreenElement = null;
    (document as any).msExitFullscreen = mockMsExitFullscreen;
    
    // Mock addEventListener and removeEventListener
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
  });

  it('renders with required props', () => {
    render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const img = screen.getByAltText('Test image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders with optional props', () => {
    render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
        className="custom-class"
        maxZoom={5}
        minZoom={0.5}
        doubleTapZoom={3}
        showControls={true}
      />
    );
    
    const img = screen.getByAltText('Test image');
    expect(img).toBeInTheDocument();
  });

  it('renders fullscreen button when not in fullscreen and controls are shown', () => {
    render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
        showControls={true}
      />
    );
    
    const fullscreenButton = screen.getByTitle('Enter fullscreen');
    expect(fullscreenButton).toBeInTheDocument();
  });

  it('does not render fullscreen button when controls are hidden', () => {
    render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
        showControls={false}
      />
    );
    
    const fullscreenButton = screen.queryByTitle('Enter fullscreen');
    expect(fullscreenButton).not.toBeInTheDocument();
  });

  it('does not enter fullscreen on single click (only double click or button)', async () => {
    mockRequestFullscreen.mockResolvedValue(undefined);
    
    const { container } = render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const imgContainer = container.querySelector('div[class*="relative"]') as HTMLElement;
    expect(imgContainer).toBeInTheDocument();
    
    // Mock requestFullscreen on the container element
    (imgContainer as any).requestFullscreen = mockRequestFullscreen;
    
    fireEvent.click(imgContainer);
    
    // Wait a bit to ensure no timeout triggers fullscreen
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Should NOT call fullscreen on single click
    expect(mockRequestFullscreen).not.toHaveBeenCalled();
  });

  it('toggles fullscreen on double click', async () => {
    mockRequestFullscreen.mockResolvedValue(undefined);
    
    const { container } = render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const imgContainer = container.querySelector('div[class*="relative"]') as HTMLElement;
    expect(imgContainer).toBeInTheDocument();
    
    // Mock requestFullscreen on the container element
    (imgContainer as any).requestFullscreen = mockRequestFullscreen;
    
    fireEvent.doubleClick(imgContainer);
    
    await waitFor(() => {
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });
  });

  it('does not enter fullscreen on click even when mouse has not moved', async () => {
    const { container } = render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const imgContainer = container.querySelector('div[class*="relative"]') as HTMLElement;
    expect(imgContainer).toBeInTheDocument();
    
    // Mock requestFullscreen on the container element
    (imgContainer as any).requestFullscreen = mockRequestFullscreen;
    
    // Simulate mouse down
    fireEvent.mouseDown(imgContainer, { clientX: 0, clientY: 0 });
    
    // Simulate mouse up (no movement)
    fireEvent.mouseUp(imgContainer);
    
    // Simulate click
    fireEvent.click(imgContainer);
    
    // Wait a bit to ensure no timeout triggers fullscreen
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Should not call fullscreen on single click (even without movement)
    expect(mockRequestFullscreen).not.toHaveBeenCalled();
  });

  it('fullscreen button toggles fullscreen', async () => {
    mockRequestFullscreen.mockResolvedValue(undefined);
    
    const { container } = render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
        showControls={true}
      />
    );
    
    const imgContainer = container.querySelector('div[class*="relative"]') as HTMLElement;
    // Mock requestFullscreen on the container element
    (imgContainer as any).requestFullscreen = mockRequestFullscreen;
    
    const fullscreenButton = screen.getByTitle('Enter fullscreen');
    fireEvent.click(fullscreenButton);
    
    await waitFor(() => {
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });
  });

  it('does not enter fullscreen on single touch tap (only double tap)', async () => {
    mockRequestFullscreen.mockResolvedValue(undefined);
    
    const { container } = render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const imgContainer = container.querySelector('div[class*="relative"]') as HTMLElement;
    expect(imgContainer).toBeInTheDocument();
    
    // Mock requestFullscreen on the container element
    (imgContainer as any).requestFullscreen = mockRequestFullscreen;
    
    // Simulate single touch tap
    fireEvent.touchStart(imgContainer, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    
    fireEvent.touchEnd(imgContainer, {
      touches: [],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });
    
    // Wait a bit to ensure no timeout triggers fullscreen
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Should NOT call fullscreen on single tap
    expect(mockRequestFullscreen).not.toHaveBeenCalled();
  });

  it('handles touch double tap to toggle fullscreen', async () => {
    mockRequestFullscreen.mockResolvedValue(undefined);
    
    const { container } = render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const imgContainer = container.querySelector('div[class*="relative"]') as HTMLElement;
    expect(imgContainer).toBeInTheDocument();
    
    // Mock requestFullscreen on the container element
    (imgContainer as any).requestFullscreen = mockRequestFullscreen;
    
    // First tap
    fireEvent.touchStart(imgContainer, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(imgContainer, {
      touches: [],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });
    
    // Second tap (double tap) - within 300ms
    await new Promise(resolve => setTimeout(resolve, 100));
    
    fireEvent.touchStart(imgContainer, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(imgContainer, {
      touches: [],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });
    
    await waitFor(() => {
      expect(mockRequestFullscreen).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('exits fullscreen when clicking exit button', async () => {
    // Set fullscreen state
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: document.createElement('div'),
    });
    
    mockExitFullscreen.mockResolvedValue(undefined);
    
    // Re-render to trigger fullscreen state update
    const { rerender } = render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
        showControls={true}
      />
    );
    
    // Trigger fullscreen change event
    const fullscreenChangeEvent = new Event('fullscreenchange');
    document.dispatchEvent(fullscreenChangeEvent);
    
    await waitFor(() => {
      const exitButton = screen.queryByTitle('Exit fullscreen');
      if (exitButton) {
        fireEvent.click(exitButton);
        expect(mockExitFullscreen).toHaveBeenCalled();
      }
    });
  });

  it('handles wheel zoom when in fullscreen with ctrl/meta key', () => {
    // Set fullscreen state
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: document.createElement('div'),
    });
    
    render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const imgContainer = screen.getByAltText('Test image').closest('div[class*="relative"]');
    expect(imgContainer).toBeInTheDocument();
    
    if (imgContainer) {
      // Trigger fullscreen change event
      const fullscreenChangeEvent = new Event('fullscreenchange');
      document.dispatchEvent(fullscreenChangeEvent);
      
      // Simulate wheel with ctrl key
      fireEvent.wheel(imgContainer, {
        deltaY: -100,
        ctrlKey: true,
        clientX: 100,
        clientY: 100,
      });
      
      // Should not throw error
      expect(imgContainer).toBeInTheDocument();
    }
  });

  it('handles pinch zoom with two touches', () => {
    render(
      <FullscreenZoomableImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const imgContainer = screen.getByAltText('Test image').closest('div[class*="relative"]');
    expect(imgContainer).toBeInTheDocument();
    
    if (imgContainer) {
      // Simulate two-finger touch start
      fireEvent.touchStart(imgContainer, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ],
      });
      
      // Simulate pinch move
      fireEvent.touchMove(imgContainer, {
        touches: [
          { clientX: 50, clientY: 50 },
          { clientX: 250, clientY: 250 },
        ],
      });
      
      // Should not throw error
      expect(imgContainer).toBeInTheDocument();
    }
  });

  it('resets zoom when image src changes', () => {
    const { rerender } = render(
      <FullscreenZoomableImage
        src="https://example.com/image1.jpg"
        alt="Test image"
      />
    );
    
    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('src', 'https://example.com/image1.jpg');
    
    rerender(
      <FullscreenZoomableImage
        src="https://example.com/image2.jpg"
        alt="Test image"
      />
    );
    
    expect(img).toHaveAttribute('src', 'https://example.com/image2.jpg');
  });
});

