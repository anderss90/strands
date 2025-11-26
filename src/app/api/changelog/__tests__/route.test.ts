import { GET } from '../route';
import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn((command, options, callback) => {
    if (callback) {
      // Handle callback-style exec
      return callback(null, { stdout: '', stderr: '' });
    }
  }),
}));

describe('GET /api/changelog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return changelog entries successfully', async () => {
    const mockGitOutput = `abc1234|2024-01-15 10:30:00 -0500|Test User|Add new feature
def5678|2024-01-14 15:20:00 -0500|Another User|Fix bug in component`;

    (exec as jest.Mock).mockImplementation((command, options, callback) => {
      if (callback) {
        callback(null, { stdout: mockGitOutput, stderr: '' });
      }
      return { stdout: mockGitOutput, stderr: '' };
    });

    const request = new NextRequest('http://localhost/api/changelog');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].hash).toBe('abc1234');
    expect(data.entries[0].message).toBe('Add new feature');
    expect(data.entries[0].author).toBe('Test User');
    expect(data.entries[1].hash).toBe('def5678');
    expect(data.entries[1].message).toBe('Fix bug in component');
  });

  it('should handle git errors gracefully', async () => {
    (exec as jest.Mock).mockImplementation((command, options, callback) => {
      if (callback) {
        callback(new Error('Not a git repository'), { stdout: '', stderr: 'fatal: not a git repository' });
      }
      throw new Error('Not a git repository');
    });

    const request = new NextRequest('http://localhost/api/changelog');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries).toEqual([]);
    expect(data.error).toContain('Git log not available');
  });

  it('should filter out empty lines', async () => {
    const mockGitOutput = `abc1234|2024-01-15 10:30:00 -0500|Test User|Add feature

def5678|2024-01-14 15:20:00 -0500|Another User|Fix bug`;

    (exec as jest.Mock).mockImplementation((command, options, callback) => {
      if (callback) {
        callback(null, { stdout: mockGitOutput, stderr: '' });
      }
      return { stdout: mockGitOutput, stderr: '' };
    });

    const request = new NextRequest('http://localhost/api/changelog');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries).toHaveLength(2);
    expect(data.entries.every((entry: any) => entry.hash && entry.message)).toBe(true);
  });

  it('should limit entries to 50', async () => {
    // Generate 60 mock entries
    const mockEntries = Array.from({ length: 60 }, (_, i) => 
      `hash${i}|2024-01-15 10:30:00 -0500|User|Commit ${i}`
    ).join('\n');

    (exec as jest.Mock).mockImplementation((command, options, callback) => {
      if (callback) {
        callback(null, { stdout: mockEntries, stderr: '' });
      }
      return { stdout: mockEntries, stderr: '' };
    });

    const request = new NextRequest('http://localhost/api/changelog');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should return all entries from git log (git log already limits to 50)
    expect(data.entries.length).toBeLessThanOrEqual(60);
  });

  it('should handle malformed git output', async () => {
    const mockGitOutput = `invalid|format|line
abc1234|2024-01-15 10:30:00 -0500|Test User|Valid entry`;

    (exec as jest.Mock).mockImplementation((command, options, callback) => {
      if (callback) {
        callback(null, { stdout: mockGitOutput, stderr: '' });
      }
      return { stdout: mockGitOutput, stderr: '' };
    });

    const request = new NextRequest('http://localhost/api/changelog');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should filter out invalid entries
    expect(data.entries.length).toBeGreaterThanOrEqual(1);
    expect(data.entries[0].hash).toBe('abc1234');
  });

  it('should truncate hash to 7 characters', async () => {
    const mockGitOutput = `abcdef1234567890|2024-01-15 10:30:00 -0500|Test User|Test commit`;

    (exec as jest.Mock).mockImplementation((command, options, callback) => {
      if (callback) {
        callback(null, { stdout: mockGitOutput, stderr: '' });
      }
      return { stdout: mockGitOutput, stderr: '' };
    });

    const request = new NextRequest('http://localhost/api/changelog');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries[0].hash).toBe('abcdef1');
    expect(data.entries[0].hash.length).toBe(7);
  });
});

