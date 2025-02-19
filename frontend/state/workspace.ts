import { Workspace } from '@/types';
import { create } from 'zustand';

interface WorkspaceState {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  workspace: null,
  setWorkspace: (workspace: Workspace | null) => set({ workspace }),
}));
