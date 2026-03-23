import { create } from 'zustand';

interface PortfolioUIState {
  selectedPortfolioId: number | null;
  isAddFormOpen: boolean;
  setSelectedPortfolioId: (id: number | null) => void;
  setIsAddFormOpen: (isOpen: boolean) => void;
}

export const usePortfolioStore = create<PortfolioUIState>((set) => ({
  selectedPortfolioId: null,
  isAddFormOpen: false,

  setSelectedPortfolioId: (id) => set({ selectedPortfolioId: id }),
  setIsAddFormOpen: (isOpen) => set({ isAddFormOpen: isOpen }),
}));
