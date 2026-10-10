import { useEffect, useState } from 'react';
import type { Task } from '../lib/api';
import { addDays, todayYmd, ymd } from '../lib/dates';
import { useStore } from '../lib/store';
import Sheet from './Sheet';
import Icon from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  task?: Task | null; // editing when set
  defaultDue?: string | null;
  shopping?: boolean;
}

const PRIORITIES = [
  { value: 4, label: 'Urgent', cls: 'p1' },
  { value: 3, label: 'High', cls: 'p2' },
  { value: 2, label: 'Medium', cls: 'p3' },
  { value: 1, label: 'Normal', cls: 'p4' },
];

export default function TaskSheet({ open, onClose, task, defaultDue = null, shopping = false }: Props) {
  const { addTask, updateTask, deleteTask, sections, shoppingSectionIds } = useStore();
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState<string>('');
  const [priority, setPriority] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContent(task?.content || '');
    setDescription(task?.description || '');
    setDue(task ? (task.due || '').slice(0, 10) : defaultDue || '');
    setPriority(task?.priority || 1);
    setSaving(false);
  }, [open, task, defaultDue]);

  const today = todayYmd();
  const tomorrow = ymd(addDays(new Date(), 1));
  const shoppingSection = sections.find((s) => shoppingSectionIds.has(s.id));

  const save = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    const input = { content: content.trim(), description, priority, due: due || null };
    const ok = task
      ? await updateTask(task.id, input)
      : await addTask({
          ...input,
          ...(shopping && shoppingSection ? { sectionId: shoppingSection.id, projectId: shoppingSection.projectId } : {}),
        });
    setSaving(false);
    if (ok) onClose();
  };

  const remove = async () => {
    if (!task) return;
    onClose();
    await deleteTask(task);
  };

  const title = task ? 'Edit task' : shopping ? 'Add to shopping list' : 'New task';

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          className="input big"
          placeholder={shopping ? 'Milk, eggs, notebook…' : 'What needs doing?'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus={!task}
          enterKeyHint="done"
        />
        {!shopping && (
          <textarea
            className="input"
            placeholder="Notes"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}

        <div className="field-label">Due</div>
        <div className="seg-row">
          <button type="button" className={`pill ${due === '' ? 'on' : ''}`} onClick={() => setDue('')}>
            No date
          </button>
          <button type="button" className={`pill ${due === today ? 'on' : ''}`} onClick={() => setDue(today)}>
            Today
          </button>
          <button type="button" className={`pill ${due === tomorrow ? 'on' : ''}`} onClick={() => setDue(tomorrow)}>
            Tomorrow
          </button>
          <label className={`pill date-pill ${due && due !== today && due !== tomorrow ? 'on' : ''}`}>
            <Icon name="calendar" size={14} />
            <span>{due && due !== today && due !== tomorrow ? due.split('-').reverse().join('/') : 'Pick'}</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Pick a date" />
          </label>
        </div>

        {!shopping && (
          <>
            <div className="field-label">Priority</div>
            <div className="seg-row">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  className={`pill ${priority === p.value ? 'on' : ''}`}
                  onClick={() => setPriority(p.value)}
                >
                  <span className={`dot ${p.cls}`} /> {p.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="sheet-actions">
          {task && (
            <button type="button" className="btn ghost danger" onClick={remove}>
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
          <button type="submit" className="btn primary" disabled={!content.trim() || saving}>
            {saving ? 'Saving…' : task ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
