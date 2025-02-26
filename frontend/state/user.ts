import { User } from '@/types';
import { create } from 'zustand';

interface UserState {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>()((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  user: null,
  setUser: (user: User | null) => set({ user }),
}));
