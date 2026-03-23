export interface PortfolioItem {
  id: number;
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
}

export interface Portfolio {
  id: number;
  name: string;
  items: PortfolioItem[];
}
