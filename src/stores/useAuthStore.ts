'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SessionService, type Session } from '@/services/auth/SessionService';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initializeSession: () => Promise<void>;
  updatePreferences: (leverage: number, marginMode: 'cross' | 'isolated') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isLoading: false,
      isInitialized: false,

      initializeSession: async () => {
        set({ isLoading: true });
        try {
          // Get or create session
          let session = SessionService.getSession();
          if (!session) {
            session = SessionService.createSession();
          }
          set({ session, isInitialized: true });
        } catch (error) {
          console.error('Failed to initialize session:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      updatePreferences: (leverage: number, marginMode: 'cross' | 'isolated') => {
        try {
          const session = SessionService.updatePreferences(leverage, marginMode);
          set({ session });
        } catch (error) {
          console.error('Failed to update preferences:', error);
        }
      },

      logout: () => {
        SessionService.clearSession();
        set({ session: null });
      },
    }),
    {
      name: 'sorooshx-auth-store',
    }
  )
);
