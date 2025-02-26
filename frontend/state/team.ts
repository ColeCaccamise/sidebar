import { Team } from '@/types';
import { create } from 'zustand';

interface TeamState {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  team: Team | null;
  setTeam: (team: Team | null) => void;
}

export const useTeamStore = create<TeamState>()((set) => ({
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  team: null,
  setTeam: (team: Team | null) => set({ team }),
}));
