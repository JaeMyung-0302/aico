import { describe, it, expect, beforeEach } from "vitest";
import { InputManager } from "../game/input/input-manager";

describe("InputManager", () => {
  let inputManager: InputManager;

  beforeEach(() => {
    inputManager = new InputManager();
  });

  describe("initial state", () => {
    it("should have zero movement direction", () => {
      const state = inputManager.getState();
      expect(state.moveX).toBe(0);
      expect(state.moveY).toBe(0);
    });

    it("should have no actions pressed", () => {
      const state = inputManager.getState();
      expect(state.action).toBe(false);
      expect(state.cancel).toBe(false);
      expect(state.interact).toBe(false);
    });
  });

  describe("state updates", () => {
    it("should update movement from provider state", () => {
      inputManager.updateFromProvider({
        moveX: 1,
        moveY: 0,
        action: false,
        cancel: false,
        interact: false,
      });
      const state = inputManager.getState();
      expect(state.moveX).toBe(1);
      expect(state.moveY).toBe(0);
    });

    it("should normalize diagonal movement", () => {
      inputManager.updateFromProvider({
        moveX: 1,
        moveY: 1,
        action: false,
        cancel: false,
        interact: false,
      });
      const state = inputManager.getState();
      const magnitude = Math.sqrt(state.moveX ** 2 + state.moveY ** 2);
      expect(magnitude).toBeCloseTo(1, 2);
    });

    it("should not normalize when movement is zero", () => {
      inputManager.updateFromProvider({
        moveX: 0,
        moveY: 0,
        action: false,
        cancel: false,
        interact: false,
      });
      const state = inputManager.getState();
      expect(state.moveX).toBe(0);
      expect(state.moveY).toBe(0);
    });

    it("should update action states", () => {
      inputManager.updateFromProvider({
        moveX: 0,
        moveY: 0,
        action: true,
        cancel: false,
        interact: true,
      });
      const state = inputManager.getState();
      expect(state.action).toBe(true);
      expect(state.interact).toBe(true);
      expect(state.cancel).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset all state to defaults", () => {
      inputManager.updateFromProvider({
        moveX: 1,
        moveY: -1,
        action: true,
        cancel: true,
        interact: true,
      });
      inputManager.reset();
      const state = inputManager.getState();
      expect(state.moveX).toBe(0);
      expect(state.moveY).toBe(0);
      expect(state.action).toBe(false);
      expect(state.cancel).toBe(false);
      expect(state.interact).toBe(false);
    });
  });

  describe("getState immutability", () => {
    it("should return a new object each call", () => {
      const state1 = inputManager.getState();
      const state2 = inputManager.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });
});
