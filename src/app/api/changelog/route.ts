import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ChangelogEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get git log with formatted output
    // Format: %H|%ai|%an|%s
    // %H = full commit hash
    // %ai = author date, ISO 8601-like format
    // %an = author name
    // %s = subject (commit message)
    const { stdout, stderr } = await execAsync(
      'git log --pretty=format:"%H|%ai|%an|%s" -50',
      { cwd: process.cwd() }
    );

    if (stderr && !stderr.includes('warning')) {
      console.error('Git log stderr:', stderr);
    }

    const entries: ChangelogEntry[] = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, date, author, ...messageParts] = line.split('|');
        return {
          hash: hash?.substring(0, 7) || '',
          date: date || '',
          author: author || '',
          message: messageParts.join('|') || '',
        };
      })
      .filter(entry => entry.hash && entry.message);

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching changelog:', error);
    
    // If git is not available or not in a git repo, return empty array
    // This is common in production environments
    return NextResponse.json(
      { 
        entries: [],
        error: 'Git log not available. This is normal in production environments.',
      },
      { status: 200 }
    );
  }
}

