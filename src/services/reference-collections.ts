import type { FavoriteReference, RecentReference, ReferenceCollection, ReferenceCollectionMutation } from "../types";

type CollectionReference = FavoriteReference | RecentReference;

function isReference(value: unknown): value is CollectionReference {
  if (!value || typeof value !== "object") return false;
  const reference = value as Record<string, unknown>;
  if (reference.kind === "local") return typeof reference.entryId === "string" && reference.entryId.length > 0 && reference.entryId.length <= 256;
  return reference.kind === "external"
    && ["spell", "feat", "magic-item"].includes(String(reference.referenceKind))
    && typeof reference.referenceId === "string"
    && reference.referenceId.length <= 256
    && Boolean(reference.referenceId);
}

export function isReferenceCollectionMutation(value: unknown): value is ReferenceCollectionMutation {
  if (!value || typeof value !== "object") return false;
  const mutation = value as Record<string, unknown>;
  if (mutation.collection === "recentReferences" && mutation.action === "clear") return true;
  if (mutation.action === "replace" && (mutation.collection === "favoriteReferences" || mutation.collection === "recentReferences")) {
    const limit = mutation.collection === "recentReferences" ? 10 : 5_000;
    return Array.isArray(mutation.references) && mutation.references.length <= limit && mutation.references.every(isReference);
  }
  if (mutation.collection === "favoriteReferences") {
    return (mutation.action === "add" || mutation.action === "remove") && isReference(mutation.reference);
  }
  if (mutation.collection === "recentReferences") {
    return (mutation.action === "visit" || mutation.action === "remove") && isReference(mutation.reference);
  }
  return false;
}

export function referenceKey(reference: CollectionReference): string {
  return reference.kind === "local"
    ? `local:${reference.entryId}`
    : `${reference.referenceKind}:${reference.referenceId}`;
}

export function normalizeReferenceCollection(value: unknown, collection: ReferenceCollection): CollectionReference[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, CollectionReference>();
  for (const candidate of value) {
    if (!isReference(candidate)) continue;
    if (collection === "recentReferences" && unique.has(referenceKey(candidate))) continue;
    if (unique.size >= (collection === "recentReferences" ? 10 : 5_000)) break;
    unique.set(referenceKey(candidate), candidate);
  }
  return [...unique.values()];
}

export function applyReferenceCollectionMutation(
  current: unknown,
  mutation: ReferenceCollectionMutation
): CollectionReference[] {
  const references = normalizeReferenceCollection(current, mutation.collection);
  if (mutation.action === "clear") return [];
  if (mutation.action === "replace") return normalizeReferenceCollection(mutation.references, mutation.collection);
  if (!isReference(mutation.reference)) return references;
  const key = referenceKey(mutation.reference);
  const remaining = references.filter(reference => referenceKey(reference) !== key);
  if (mutation.action === "remove") return remaining;
  if (mutation.collection === "recentReferences") return [mutation.reference, ...remaining].slice(0, 10);
  return [...remaining, mutation.reference];
}
