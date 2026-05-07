export type Importance = "low" | "medium" | "high";

export type Label = {
  id: string;
  name: string;
  color: string;
};

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type Card = {
  id: string;
  title: string;
  details: string;
  importance: Importance;
  dueDate?: string | null;
  labelIds: string[];
  storyPoints?: number | null;
  checklistItems?: ChecklistItem[];
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
  wipLimit?: number | null;
};

export type BoardData = {
  id: number;
  name: string;
  columns: Column[];
  cards: Record<string, Card>;
  labels: Label[];
};

export type BoardSummary = {
  id: number;
  name: string;
  created_at: string;
};

export const IMPORTANCE_CONFIG: Record<Importance, { label: string; color: string; dot: string }> = {
  high: {
    label: "High",
    color: "text-red-600",
    dot: "bg-red-500",
  },
  medium: {
    label: "Medium",
    color: "text-amber-600",
    dot: "bg-amber-400",
  },
  low: {
    label: "Low",
    color: "text-slate-400",
    dot: "bg-slate-300",
  },
};

export const initialData: BoardData = {
  id: 0,
  name: "My Board",
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4", "card-5"] },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Align roadmap themes", details: "Draft quarterly themes.", importance: "medium", labelIds: [], checklistItems: [] },
    "card-2": { id: "card-2", title: "Gather customer signals", details: "Review support tags.", importance: "low", labelIds: [], checklistItems: [] },
    "card-3": { id: "card-3", title: "Prototype analytics view", details: "Sketch dashboard.", importance: "high", labelIds: [], checklistItems: [] },
    "card-4": { id: "card-4", title: "Refine status language", details: "Standardize labels.", importance: "medium", labelIds: [], checklistItems: [] },
    "card-5": { id: "card-5", title: "Design card layout", details: "Add hierarchy.", importance: "medium", labelIds: [], checklistItems: [] },
    "card-6": { id: "card-6", title: "QA micro-interactions", details: "Verify hover states.", importance: "high", labelIds: [], checklistItems: [] },
    "card-7": { id: "card-7", title: "Ship marketing page", details: "Final copy approved.", importance: "low", labelIds: [], checklistItems: [] },
    "card-8": { id: "card-8", title: "Close onboarding sprint", details: "Document release notes.", importance: "medium", labelIds: [], checklistItems: [] },
  },
  labels: [],
};

const isColumnId = (columns: Column[], id: string) =>
  columns.some((column) => column.id === id);

const findColumnId = (columns: Column[], id: string) => {
  if (isColumnId(columns, id)) return id;
  return columns.find((column) => column.cardIds.includes(id))?.id;
};

export const moveCard = (columns: Column[], activeId: string, overId: string): Column[] => {
  const activeColumnId = findColumnId(columns, activeId);
  const overColumnId = findColumnId(columns, overId);

  if (!activeColumnId || !overColumnId) return columns;

  const activeColumn = columns.find((c) => c.id === activeColumnId);
  const overColumn = columns.find((c) => c.id === overColumnId);

  if (!activeColumn || !overColumn) return columns;

  const isOverColumn = isColumnId(columns, overId);

  if (activeColumnId === overColumnId) {
    if (isOverColumn) {
      const nextCardIds = activeColumn.cardIds.filter((id) => id !== activeId);
      nextCardIds.push(activeId);
      return columns.map((c) => (c.id === activeColumnId ? { ...c, cardIds: nextCardIds } : c));
    }
    const oldIndex = activeColumn.cardIds.indexOf(activeId);
    const newIndex = activeColumn.cardIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return columns;
    const nextCardIds = [...activeColumn.cardIds];
    nextCardIds.splice(oldIndex, 1);
    nextCardIds.splice(newIndex, 0, activeId);
    return columns.map((c) => (c.id === activeColumnId ? { ...c, cardIds: nextCardIds } : c));
  }

  const activeIndex = activeColumn.cardIds.indexOf(activeId);
  if (activeIndex === -1) return columns;

  const nextActiveCardIds = [...activeColumn.cardIds];
  nextActiveCardIds.splice(activeIndex, 1);

  const nextOverCardIds = [...overColumn.cardIds];
  if (isOverColumn) {
    nextOverCardIds.push(activeId);
  } else {
    const overIndex = overColumn.cardIds.indexOf(overId);
    const insertIndex = overIndex === -1 ? nextOverCardIds.length : overIndex;
    nextOverCardIds.splice(insertIndex, 0, activeId);
  }

  return columns.map((c) => {
    if (c.id === activeColumnId) return { ...c, cardIds: nextActiveCardIds };
    if (c.id === overColumnId) return { ...c, cardIds: nextOverCardIds };
    return c;
  });
};

export const createId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}-${randomPart}${timePart}`;
};

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function formatDueDate(dueDate: string | null | undefined): string {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
