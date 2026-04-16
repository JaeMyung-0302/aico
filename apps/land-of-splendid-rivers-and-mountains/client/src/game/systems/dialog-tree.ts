export type DialogNodeId = string;

export interface DialogChoice {
  readonly text: string;
  readonly nextId: DialogNodeId | null;
  readonly conditionFlag?: string;
}

export interface DialogNode {
  readonly id: DialogNodeId;
  readonly speakerId: string;
  readonly text: string;
  readonly choices: ReadonlyArray<DialogChoice>;
}

export interface DialogTree {
  readonly rootId: DialogNodeId;
  readonly nodes: Readonly<Record<DialogNodeId, DialogNode>>;
}

export interface DialogContext {
  readonly flags: ReadonlyArray<string>;
}

export type SelectChoiceError = "unknownNode" | "choiceOutOfRange";

export interface SelectChoiceResult {
  readonly nextNode?: DialogNode | null;
  readonly error?: SelectChoiceError;
}

export const getNode = (
  tree: DialogTree,
  id: DialogNodeId,
): DialogNode | null => tree.nodes[id] ?? null;

const isChoiceVisible = (choice: DialogChoice, ctx: DialogContext): boolean =>
  choice.conditionFlag === undefined ||
  ctx.flags.includes(choice.conditionFlag);

export const getAvailableChoices = (
  node: DialogNode,
  ctx: DialogContext,
): ReadonlyArray<DialogChoice> =>
  node.choices.filter((c) => isChoiceVisible(c, ctx));

export const selectChoice = (
  tree: DialogTree,
  currentId: DialogNodeId,
  visibleIndex: number,
  ctx: DialogContext,
): SelectChoiceResult => {
  const current = getNode(tree, currentId);
  if (!current) return { error: "unknownNode" };

  const visible = getAvailableChoices(current, ctx);
  if (visibleIndex < 0 || visibleIndex >= visible.length) {
    return { error: "choiceOutOfRange" };
  }

  const choice = visible[visibleIndex]!;
  if (choice.nextId === null) {
    return { nextNode: null };
  }
  const next = getNode(tree, choice.nextId);
  return { nextNode: next };
};

export const traverse = (
  tree: DialogTree,
  path: ReadonlyArray<number>,
  ctx: DialogContext,
): ReadonlyArray<DialogNode> => {
  const visited: DialogNode[] = [];
  const root = getNode(tree, tree.rootId);
  if (!root) return visited;
  visited.push(root);

  let currentId: DialogNodeId | null = tree.rootId;
  for (const visibleIndex of path) {
    if (currentId === null) {
      throw new Error(
        `traverse: path attempts to step past a terminal node at index ${visibleIndex}`,
      );
    }
    const result = selectChoice(tree, currentId, visibleIndex, ctx);
    if (result.error) {
      throw new Error(
        `traverse: invalid step at visibleIndex=${visibleIndex} (${result.error})`,
      );
    }
    if (result.nextNode === null || result.nextNode === undefined) {
      // Terminal — halt without appending.
      return visited;
    }
    visited.push(result.nextNode);
    currentId = result.nextNode.id;
  }

  return visited;
};
