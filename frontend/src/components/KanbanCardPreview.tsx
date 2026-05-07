import clsx from "clsx";
import type { Card } from "@/lib/kanban";
import { IMPORTANCE_CONFIG } from "@/lib/kanban";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => {
  const importance = card.importance ?? "medium";
  return (
    <article className={clsx(
      "rounded-2xl border bg-white px-4 py-4 shadow-[0_18px_32px_rgba(3,33,71,0.16)]",
      importance === "high" ? "border-red-300" : importance === "medium" ? "border-amber-200" : "border-transparent"
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={clsx("h-2 w-2 rounded-full flex-shrink-0", IMPORTANCE_CONFIG[importance].dot)} />
        <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">{card.title}</h4>
      </div>
      {card.details && (
        <p className="mt-1 text-sm leading-6 text-[var(--gray-text)]">{card.details}</p>
      )}
    </article>
  );
};
