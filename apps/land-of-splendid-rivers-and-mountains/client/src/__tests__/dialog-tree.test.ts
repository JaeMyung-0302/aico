import { describe, it, expect } from "vitest";
import {
  getNode,
  getAvailableChoices,
  selectChoice,
  traverse,
  type DialogTree,
  type DialogContext,
} from "../game/systems/dialog-tree";

const ctx = (overrides: Partial<DialogContext> = {}): DialogContext => ({
  flags: [],
  ...overrides,
});

const tree: DialogTree = {
  rootId: "start",
  nodes: {
    start: {
      id: "start",
      speakerId: "grandfather",
      text: "마을에 무슨 일로 왔는가?",
      choices: [
        { text: "도와드릴 일이 있나요?", nextId: "offer_help" },
        {
          text: "산신령 얘기를 해주세요.",
          nextId: "mountain_spirit",
          conditionFlag: "heard_of_spirit",
        },
        { text: "갈 길이 바빠서요.", nextId: null },
      ],
    },
    offer_help: {
      id: "offer_help",
      speakerId: "grandfather",
      text: "고맙네. 약초를 좀 구해다 주게.",
      choices: [
        { text: "알겠습니다.", nextId: "quest_accepted" },
        { text: "다음에요.", nextId: null },
      ],
    },
    mountain_spirit: {
      id: "mountain_spirit",
      speakerId: "grandfather",
      text: "그 이름을 아는 자는 드물지...",
      choices: [{ text: "...", nextId: null }],
    },
    quest_accepted: {
      id: "quest_accepted",
      speakerId: "grandfather",
      text: "부탁함세.",
      choices: [],
    },
  },
};

describe("getNode", () => {
  it("returns the node for a valid id", () => {
    expect(getNode(tree, "start")?.id).toBe("start");
  });

  it("returns null for an unknown id", () => {
    expect(getNode(tree, "nonexistent")).toBeNull();
  });
});

describe("getAvailableChoices", () => {
  it("returns all choices when no conditions are present", () => {
    const node = getNode(tree, "offer_help")!;
    expect(getAvailableChoices(node, ctx()).length).toBe(2);
  });

  it("hides choices whose conditionFlag is absent from context", () => {
    const node = getNode(tree, "start")!;
    const choices = getAvailableChoices(node, ctx({ flags: [] }));
    expect(choices.length).toBe(2);
    expect(choices.map((c) => c.text)).not.toContain("산신령 얘기를 해주세요.");
  });

  it("reveals conditional choices once the flag is set", () => {
    const node = getNode(tree, "start")!;
    const choices = getAvailableChoices(
      node,
      ctx({ flags: ["heard_of_spirit"] }),
    );
    expect(choices.length).toBe(3);
    expect(choices.map((c) => c.text)).toContain("산신령 얘기를 해주세요.");
  });
});

describe("selectChoice", () => {
  it("returns the next node when the choice index is valid and available", () => {
    const result = selectChoice(tree, "start", 0, ctx());
    expect(result.error).toBeUndefined();
    expect(result.nextNode?.id).toBe("offer_help");
  });

  it("returns nextNode=null for a terminal choice (nextId=null)", () => {
    // Visible-index indexing: the conditional choice is hidden without the flag,
    // so the "갈 길이 바빠서요." terminal option is visible-index 1.
    const r = selectChoice(tree, "start", 1, ctx());
    expect(r.error).toBeUndefined();
    expect(r.nextNode).toBeNull();
  });

  it("returns an error when the choice index is out of range", () => {
    const result = selectChoice(tree, "start", 99, ctx());
    expect(result.error).toBe("choiceOutOfRange");
    expect(result.nextNode).toBeUndefined();
  });

  it("returns an error when currentId is unknown", () => {
    const result = selectChoice(tree, "nonexistent", 0, ctx());
    expect(result.error).toBe("unknownNode");
  });

  it("operates on post-filter indexing: hidden conditional choices do not shift visible indices", () => {
    // When flag is not set, the middle conditional choice is hidden.
    // Visible choices at start: [offer_help (0), terminal_null (1)]
    const visible0 = selectChoice(tree, "start", 0, ctx());
    expect(visible0.nextNode?.id).toBe("offer_help");

    const visible1 = selectChoice(tree, "start", 1, ctx());
    expect(visible1.nextNode).toBeNull();
  });

  it("when flag is set, conditional choice becomes selectable by its new visible index", () => {
    const r = selectChoice(
      tree,
      "start",
      1,
      ctx({ flags: ["heard_of_spirit"] }),
    );
    expect(r.nextNode?.id).toBe("mountain_spirit");
  });
});

describe("traverse", () => {
  it("returns the root node for an empty path", () => {
    const nodes = traverse(tree, [], ctx());
    expect(nodes.length).toBe(1);
    expect(nodes[0]!.id).toBe("start");
  });

  it("follows a path of visible choice indices", () => {
    const nodes = traverse(tree, [0, 0], ctx()); // start → offer_help → quest_accepted
    expect(nodes.map((n) => n.id)).toEqual([
      "start",
      "offer_help",
      "quest_accepted",
    ]);
  });

  it("halts at a terminal (null) transition and does not append a node", () => {
    const nodes = traverse(tree, [1], ctx()); // start → terminal
    expect(nodes.map((n) => n.id)).toEqual(["start"]);
  });

  it("throws on an invalid path index", () => {
    expect(() => traverse(tree, [99], ctx())).toThrow();
  });
});

describe("purity", () => {
  it("selectChoice does not mutate the tree", () => {
    const snapshot = structuredClone(tree);
    selectChoice(tree, "start", 0, ctx());
    expect(tree).toEqual(snapshot);
  });

  it("traverse does not mutate the tree or the context", () => {
    const treeSnapshot = structuredClone(tree);
    const c = ctx({ flags: ["heard_of_spirit"] });
    const ctxSnapshot = structuredClone(c);
    traverse(tree, [0, 0], c);
    expect(tree).toEqual(treeSnapshot);
    expect(c).toEqual(ctxSnapshot);
  });
});
