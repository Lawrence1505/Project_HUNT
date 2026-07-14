import { useMemo } from "react";
import { BookOpen, FileText, Timer, Trophy } from "lucide-react";
import { useHeal } from "../../store/store";
import { statLevelProgress } from "../../lib/xp";
import { lastNDates } from "../../lib/dates";
import { ProgressBar, StatTile } from "../../components/ui";
import { fmtMin } from "./shared";
import LibrarySection from "./LibrarySection";
import StudySection from "./StudySection";

export default function LearningPage() {
  const books = useHeal((s) => s.books);
  const studySessions = useHeal((s) => s.studySessions);
  const knowledgeXp = useHeal((s) => s.statXp.knowledge);

  const knowledge = statLevelProgress(knowledgeXp);

  const finishedCount = useMemo(
    () => books.filter((b) => b.status === "finished").length,
    [books]
  );
  const pagesRead = useMemo(
    () => books.reduce((sum, b) => sum + b.currentPage, 0),
    [books]
  );
  const weekMinutes = useMemo(() => {
    const week = new Set(lastNDates(7));
    return studySessions.reduce(
      (sum, s) => (week.has(s.date) ? sum + s.minutes : sum),
      0
    );
  }, [studySessions]);

  return (
    <div className="page">
      <h1 className="page-title">Learning</h1>
      <p className="page-subtitle">
        Books, highlights and study sessions — every page levels up your Knowledge stat.
      </p>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatTile
          label="Knowledge"
          value={`Lv ${knowledge.level}`}
          sub={
            <ProgressBar
              value={knowledge.pct * 100}
              color="var(--cat-knowledge)"
              height={5}
            />
          }
          icon={<BookOpen size={14} />}
          accent="var(--cat-knowledge)"
        />
        <StatTile
          label="Books finished"
          value={finishedCount}
          sub={`${books.length} in library`}
          icon={<Trophy size={14} />}
          accent="#fbbf24"
        />
        <StatTile
          label="Pages read"
          value={pagesRead.toLocaleString()}
          sub="across all books"
          icon={<FileText size={14} />}
          accent="var(--cyan)"
        />
        <StatTile
          label="Study this week"
          value={fmtMin(weekMinutes)}
          sub="last 7 days"
          icon={<Timer size={14} />}
          accent="var(--blue)"
        />
      </div>

      <LibrarySection />
      <StudySection />
    </div>
  );
}
