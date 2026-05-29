export interface TradeState {
  readonly gold: number;
  readonly items: Readonly<Record<string, number>>;
}

export type TradeOrderType = "buy" | "sell";

export interface TradeOrder {
  readonly type: TradeOrderType;
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface TradeCheckResult {
  readonly ok: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export const createTradeState = (
  overrides: Partial<TradeState> = {},
): TradeState => ({
  gold: 0,
  items: {},
  ...overrides,
});

const totalCost = (order: TradeOrder): number =>
  order.quantity * order.unitPrice;

export const canExecute = (
  state: TradeState,
  order: TradeOrder,
): TradeCheckResult => {
  const reasons: string[] = [];

  if (!Number.isFinite(order.quantity) || order.quantity <= 0) {
    reasons.push("invalidQuantity");
  }

  if (!Number.isFinite(order.unitPrice) || order.unitPrice <= 0) {
    reasons.push("invalidPrice");
  }

  // Only check gold/inventory when the order itself is structurally valid —
  // otherwise we'd report spurious reasons for a malformed order.
  const structurallyValid = reasons.length === 0;

  if (structurallyValid && order.type === "buy") {
    if (state.gold < totalCost(order)) reasons.push("insufficientGold");
  }

  if (structurallyValid && order.type === "sell") {
    const stock = state.items[order.itemId] ?? 0;
    if (stock < order.quantity) reasons.push("insufficientInventory");
  }

  return { ok: reasons.length === 0, reasons };
};

export const executeTrade = (
  state: TradeState,
  order: TradeOrder,
): TradeState => {
  const check = canExecute(state, order);
  if (!check.ok) {
    throw new Error(
      `executeTrade: order rejected — ${check.reasons.join(", ")}`,
    );
  }

  const cost = totalCost(order);
  const stock = state.items[order.itemId] ?? 0;

  if (order.type === "buy") {
    return {
      gold: state.gold - cost,
      items: { ...state.items, [order.itemId]: stock + order.quantity },
    };
  }

  // sell
  const remaining = stock - order.quantity;
  const newItems: Record<string, number> = { ...state.items };
  if (remaining <= 0) {
    delete newItems[order.itemId];
  } else {
    newItems[order.itemId] = remaining;
  }
  return {
    gold: state.gold + cost,
    items: newItems,
  };
};

export const applyOrders = (
  state: TradeState,
  orders: ReadonlyArray<TradeOrder>,
): TradeState => {
  let current = state;
  for (const order of orders) {
    current = executeTrade(current, order);
  }
  return current;
};
