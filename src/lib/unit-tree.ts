export type UnitTreeNode = {
  id: string;
  parentId: string | null;
  name?: string;
  code?: string;
};

export function canAssignUnitParent(nodes: UnitTreeNode[], unitId: string, candidateParentId: string | null) {
  if (!candidateParentId) {
    return true;
  }

  if (candidateParentId === unitId) {
    return false;
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  let currentId: string | null = candidateParentId;

  while (currentId) {
    if (currentId === unitId) {
      return false;
    }

    currentId = nodesById.get(currentId)?.parentId ?? null;
  }

  return true;
}

export function assertValidUnitParent(nodes: UnitTreeNode[], unitId: string, candidateParentId: string | null) {
  if (!canAssignUnitParent(nodes, unitId, candidateParentId)) {
    throw new Error("Invalid unit parent: looping hierarchy detected");
  }
}

export function collectDescendantUnitIds(nodes: UnitTreeNode[], rootUnitId: string): string[] {
  const childrenByParent = new Map<string, string[]>();

  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node.id);
    childrenByParent.set(node.parentId, siblings);
  }

  const descendants: string[] = [];
  const queue = [...(childrenByParent.get(rootUnitId) ?? [])];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId) {
      continue;
    }

    descendants.push(currentId);
    queue.push(...(childrenByParent.get(currentId) ?? []));
  }

  return descendants;
}

export function getBlockedParentIds(nodes: UnitTreeNode[], unitId: string): Set<string> {
  const blocked = new Set<string>([unitId]);

  for (const descendantId of collectDescendantUnitIds(nodes, unitId)) {
    blocked.add(descendantId);
  }

  return blocked;
}

export function assertKeuskupanRootRule(kind: string, parentId: string | null) {
  if (kind === "keuskupan" && parentId) {
    throw new Error("Keuskupan tidak boleh memiliki unit induk");
  }
}
