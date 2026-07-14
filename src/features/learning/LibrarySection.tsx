import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { BookMarked, BookOpen, Plus, Trophy } from "lucide-react";
import { useHeal } from "../../store/store";
import type { Book } from "../../store/types";
import { EmptyState, Modal, SectionHeader } from "../../components/ui";
import BookCard from "./BookCard";

type BookStatus = Book["status"];

const TABS: Array<{ key: BookStatus; label: string }> = [
  { key: "reading", label: "Reading" },
  { key: "wishlist", label: "Wishlist" },
  { key: "finished", label: "Finished" },
];

const EMPTY_COPY: Record<BookStatus, { title: string; hint: string }> = {
  reading: {
    title: "Nothing on your nightstand",
    hint: "Your next level-up is hiding inside a book. Add one and start turning pages.",
  },
  wishlist: {
    title: "Your wishlist is empty",
    hint: "Spotted a book you want to read someday? Park it here so it never slips away.",
  },
  finished: {
    title: "No finished books yet",
    hint: "Turn the last page of any book to earn a big Knowledge reward — it lands here in gold.",
  },
};

export default function LibrarySection() {
  const books = useHeal((s) => s.books);
  const addBook = useHeal((s) => s.addBook);

  const [tab, setTab] = useState<BookStatus>("reading");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [status, setStatus] = useState<BookStatus>("reading");

  const counts = useMemo(() => {
    const c: Record<BookStatus, number> = { reading: 0, wishlist: 0, finished: 0 };
    for (const b of books) c[b.status] += 1;
    return c;
  }, [books]);

  const visible = useMemo(() => books.filter((b) => b.status === tab), [books, tab]);

  const openModal = () => {
    setTitle("");
    setAuthor("");
    setPages("");
    setStatus(tab === "wishlist" ? "wishlist" : "reading");
    setOpen(true);
  };

  const canSubmit = title.trim().length > 0 && Number(pages) >= 1;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    addBook({
      title: title.trim(),
      author: author.trim() || undefined,
      totalPages: Math.round(Number(pages)),
      status,
    });
    setOpen(false);
    setTab(status);
  };

  const emptyIcon =
    tab === "reading" ? (
      <BookOpen size={28} />
    ) : tab === "wishlist" ? (
      <BookMarked size={28} />
    ) : (
      <Trophy size={28} />
    );

  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeader
        title="Library"
        action={
          <button className="btn btn-primary btn-sm" onClick={openModal}>
            <Plus size={16} /> Add Book
          </button>
        }
      />

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} · {counts[t.key]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={emptyIcon}
            title={EMPTY_COPY[tab].title}
            hint={EMPTY_COPY[tab].hint}
            action={
              tab === "finished" ? undefined : (
                <button className="btn btn-primary" onClick={openModal}>
                  <Plus size={16} /> Add your first book
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-2">
          {visible.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Book">
        <form className="col" onSubmit={submit}>
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Atomic Habits"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Author (optional)</label>
            <input
              className="input"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="James Clear"
            />
          </div>
          <div className="row">
            <div className="grow">
              <label className="label">Total pages</label>
              <input
                className="input"
                type="number"
                min={1}
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="320"
                required
              />
            </div>
            <div className="grow">
              <label className="label">Status</label>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
              >
                <option value="reading">Reading</option>
                <option value="wishlist">Wishlist</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            <Plus size={16} /> Add to library
          </button>
        </form>
      </Modal>
    </section>
  );
}
