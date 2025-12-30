/**
 * SessionService - Manages user sessions and authentication
 * Handles session creation, persistence, and preferences
 */

import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  sessionKey: string;
  username: string;
  isGuest: boolean;
  defaultLeverage: number;
  defaultMarginMode: 'cross' | 'isolated';
  createdAt: string;
  updatedAt: string;
}

const SESSION_STORAGE_KEY = 'sorooshx-session';

export class SessionService {
  /**
   * Create a new guest session
   */
  static createSession(): Session {
    const sessionKey = uuidv4();
    const now = new Date().toISOString();

    const session: Session = {
      id: sessionKey,
      sessionKey: sessionKey,
      username: `guest_${sessionKey.slice(0, 8)}`,
      isGuest: true,
      defaultLeverage: 10,
      defaultMarginMode: 'cross',
      createdAt: now,
      updatedAt: now,
    };

    this.saveSession(session);
    return session;
  }

  /**
   * Get current session or create one if none exists
   */
  static getOrCreateSession(): Session {
    let session = this.getSession();
    if (!session) {
      session = this.createSession();
    }
    return session;
  }

  /**
   * Get current session from storage
   */
  static getSession(): Session | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse session from storage:', error);
      return null;
    }
  }

  /**
   * Save session to storage
   */
  static saveSession(session: Session): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Update session preferences
   */
  static updatePreferences(
    leverage: number,
    marginMode: 'cross' | 'isolated'
  ): Session {
    const session = this.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    session.defaultLeverage = leverage;
    session.defaultMarginMode = marginMode;
    session.updatedAt = new Date().toISOString();

    this.saveSession(session);
    return session;
  }

  /**
   * Clear current session
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Check if session is valid
   */
  static isValid(session: Session | null): boolean {
    if (!session) return false;
    // Sessions don't expire in this implementation
    return session.isGuest && !!session.sessionKey;
  }
}
