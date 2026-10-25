import { afterEach, describe, expect, it, vi } from "vitest";

describe("écritures des collections du service worker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sérialise les ajouts de deux panneaux au lieu d’écraser le premier", async () => {
    let stored: Record<string, unknown> = { favoriteReferences: [], recentReferences: [] };
    let onMessage: ((message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void) | undefined;
    const chromeMock = {
      contextMenus: { removeAll: (callback: () => void) => callback(), create: vi.fn(), onClicked: { addListener: vi.fn() } },
      runtime: { onInstalled: { addListener: vi.fn() }, onMessage: { addListener: (listener: typeof onMessage) => { onMessage = listener; } } },
      action: { onClicked: { addListener: vi.fn() } },
      storage: { local: { get: vi.fn(async (key: string) => ({ [key]: stored[key] })), set: vi.fn(async (next: Record<string, unknown>) => { stored = { ...stored, ...next }; }) } },
      tabs: { sendMessage: vi.fn(), create: vi.fn() }
    };
    vi.stubGlobal("chrome", chromeMock);
    await import("../src/background");
    expect(onMessage).toBeTypeOf("function");
    const sendMutation = (entryId: string) => new Promise<{ ok: boolean }>((resolve, reject) => {
      const keepAlive = onMessage!({
        type: "DD55_UPDATE_REFERENCE_COLLECTION",
        mutation: { collection: "favoriteReferences", action: "add", reference: { kind: "local", entryId } }
      }, {}, response => resolve(response as { ok: boolean }));
      if (!keepAlive) reject(new Error("Le service worker n’a pas conservé le canal de réponse."));
    });
    const responses = await Promise.all([sendMutation("spell-shield"), sendMutation("spell-bless")]);
    expect(responses.every(response => response.ok)).toBe(true);
    expect(stored.favoriteReferences).toEqual([
      { kind: "local", entryId: "spell-shield" },
      { kind: "local", entryId: "spell-bless" }
    ]);
    expect(chromeMock.storage.local.get).toHaveBeenCalledTimes(2);
    expect(chromeMock.storage.local.set).toHaveBeenCalledTimes(2);
  });
});
