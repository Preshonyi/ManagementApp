import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Cloud,
  FileUp,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { isFirebaseConfigured } from './lib/firebase';
import { isSupabaseConfigured } from './lib/supabase';
import { deleteTask, fetchTasks, saveTask, subscribeToTasks } from './services/taskService';

const emptyTask = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  deadline: '',
  reminder_at: '',
  assigned_to: '',
  shared_with: '',
  attachment_url: '',
  attachment_name: '',
};

const priorityStyles = {
  low: 'bg-white text-navy ring-navy/20',
  medium: 'bg-redbrand/10 text-redbrand ring-redbrand/25',
  high: 'bg-redbrand text-white ring-redbrand',
};

const statusLabels = {
  todo: 'To do',
  'in-progress': 'In progress',
  completed: 'Completed',
};

function getAdminEmails() {
  return (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return 'No deadline';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isOverdue(task) {
  return task.deadline && task.status !== 'completed' && new Date(task.deadline) < new Date();
}

function isDueSoon(task) {
  if (!task.deadline || task.status === 'completed') return false;
  const diff = new Date(task.deadline).getTime() - Date.now();
  return diff > 0 && diff <= 1000 * 60 * 60 * 24;
}

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('pcp_theme', 'light');
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-white text-navy">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-redbrand border-t-transparent" />
      </main>
    );
  }

  return user ? <Dashboard /> : <AuthScreen />;
}

function AuthScreen() {
  const { login, register, authMode } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: 'admin@example.com',
    password: 'password123',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isRegistering) {
        await register(form);
      } else {
        await login(form);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-white text-navy">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-redbrand text-white shadow-soft">
              <Cloud size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-redbrand">
                Shoprite Nigeria
              </p>
              <h1 className="text-xl font-bold">Cloud To-Do Management</h1>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-navy ring-1 ring-navy/15">
              <ShieldCheck size={16} aria-hidden="true" />
              Firebase auth + Supabase realtime storage
            </p>
            <h2 className="text-4xl font-bold leading-tight sm:text-5xl">
              Secure staff tasks, reminders, files, and progress reports in one cloud workspace.
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <FeaturePill icon={<CheckCircle2 size={18} />} label="Task CRUD" />
              <FeaturePill icon={<Bell size={18} />} label="Reminders" />
              <FeaturePill icon={<BarChart3 size={18} />} label="Analytics" />
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg bg-white p-6 shadow-soft ring-1 ring-navy/15"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold">{isRegistering ? 'Create account' : 'Sign in'}</h2>
              <p className="mt-1 text-sm text-navy/70">
                {authMode === 'demo'
                  ? 'Demo mode is active until Firebase credentials are added.'
                  : 'Use your Firebase account credentials.'}
              </p>
            </div>

            {isRegistering && (
              <TextInput
                id="name"
                label="Full name"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                required
              />
            )}
            <TextInput
              id="email"
              label="Email address"
              type="email"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
              required
            />
            <TextInput
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(value) => setForm({ ...form, password: value })}
              minLength={6}
              required
            />

            {error && (
              <p className="mb-4 rounded-md bg-redbrand/10 px-3 py-2 text-sm text-redbrand">
                {error}
              </p>
            )}

            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Please wait...' : isRegistering ? 'Create account' : 'Sign in'}
            </button>

            <button
              type="button"
              className="mt-4 w-full rounded-md px-4 py-3 text-sm font-semibold text-redbrand hover:bg-redbrand/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-redbrand"
              onClick={() => {
                setError('');
                setIsRegistering(!isRegistering);
              }}
            >
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Dashboard() {
  const { user, logout, authMode } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const dashboardRef = useRef(null);
  const tasksRef = useRef(null);
  const collaborationRef = useRef(null);
  const staffRef = useRef(null);

  const isAdmin = getAdminEmails().includes(user.email?.toLowerCase());

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setError('');
    try {
      const data = await fetchTasks({ user, isAdmin });
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Could not load tasks.');
    } finally {
      setLoadingTasks(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    loadTasks();
    return subscribeToTasks(loadTasks);
  }, [loadTasks]);

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    tasks.filter(isDueSoon).forEach((task) => {
      if (sessionStorage.getItem(`notified-${task.id}`)) return;
      new Notification(`Reminder: ${task.title}`, {
        body: `Deadline: ${formatDate(task.deadline)}`,
      });
      sessionStorage.setItem(`notified-${task.id}`, 'true');
    });
  }, [tasks]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const overdue = tasks.filter(isOverdue).length;
    const dueSoon = tasks.filter(isDueSoon).length;
    return { total: tasks.length, completed, overdue, dueSoon };
  }, [tasks]);

  const collaborativeTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to || task.shared_with),
    [tasks],
  );

  const staffStats = useMemo(() => {
    const email = user.email?.toLowerCase() || '';
    return {
      createdByMe: tasks.filter((task) => task.created_by === user.uid).length,
      assignedToMe: tasks.filter((task) => task.assigned_to?.toLowerCase() === email).length,
      sharedWithMe: tasks.filter((task) =>
        task.shared_with
          ?.split(',')
          .map((item) => item.trim().toLowerCase())
          .includes(email),
      ).length,
    };
  }, [tasks, user.email, user.uid]);

  const filteredTasks = useMemo(() => {
    const searchValue = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !searchValue ||
        [task.title, task.description, task.assigned_to, task.created_by_email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchValue));
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  async function handleDelete(taskId) {
    const confirmed = window.confirm('Delete this task permanently?');
    if (!confirmed) return;

    try {
      await deleteTask(taskId);
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setToast('Task deleted.');
    } catch (err) {
      setError(err.message || 'Could not delete task.');
    }
  }

  function handleNavSelect(section) {
    const targets = {
      dashboard: dashboardRef,
      tasks: tasksRef,
      collaboration: collaborationRef,
      staff: staffRef,
    };
    setActiveNav(section);
    targets[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleNotificationPermission() {
    if (!('Notification' in window)) {
      setToast('This browser does not support desktop notifications.');
      return;
    }

    const result = await Notification.requestPermission();
    setToast(result === 'granted' ? 'Task reminders enabled.' : 'Task reminders were not enabled.');
  }

  return (
    <main className="min-h-dvh bg-white text-navy">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="rounded-lg bg-navy p-5 text-white shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-redbrand">
              <Cloud size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-white/75">Cloud Workspace</p>
              <h1 className="font-bold">Probase Todo</h1>
            </div>
          </div>

          <nav className="mt-8 space-y-2" aria-label="Dashboard">
            <NavItem
              icon={<BarChart3 size={18} />}
              label="Dashboard"
              active={activeNav === 'dashboard'}
              onClick={() => handleNavSelect('dashboard')}
            />
            <NavItem
              icon={<CheckCircle2 size={18} />}
              label="Tasks"
              active={activeNav === 'tasks'}
              onClick={() => handleNavSelect('tasks')}
            />
            <NavItem
              icon={<Users size={18} />}
              label="Collaboration"
              active={activeNav === 'collaboration'}
              onClick={() => handleNavSelect('collaboration')}
            />
            <NavItem
              icon={<ShieldCheck size={18} />}
              label={isAdmin ? 'Admin enabled' : 'Staff view'}
              active={activeNav === 'staff'}
              onClick={() => handleNavSelect('staff')}
            />
          </nav>

          <button
            type="button"
            className="mt-8 w-full rounded-lg bg-white/8 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((current) => !current)}
          >
            <p className="text-sm font-semibold">{user.displayName || user.email}</p>
            <p className="mt-1 break-words text-sm text-white/75">{user.email}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-red-100">
              {authMode === 'firebase' ? 'Firebase authentication' : 'Local demo authentication'}
            </p>
          </button>

          {accountOpen && (
            <div className="mt-3 rounded-lg bg-white p-4 text-navy shadow-soft">
              <p className="text-sm font-semibold">Account</p>
              <p className="mt-1 text-sm text-navy/70">
                {isAdmin ? 'Admin reporting access is enabled.' : 'Staff access is enabled.'}
              </p>
              <button className="btn-secondary mt-4 w-full justify-center" onClick={logout}>
                <LogOut size={18} aria-hidden="true" />
                Logout
              </button>
            </div>
          )}
        </aside>

        <section className="min-w-0">
          <header className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow-soft ring-1 ring-navy/15 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-redbrand">
                Task management system
              </p>
              <h2 className="mt-1 text-2xl font-bold">Staff productivity dashboard</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <IconButton label="Request task reminder notifications" onClick={handleNotificationPermission}>
                <Bell size={20} />
              </IconButton>
              <button className="btn-secondary" onClick={logout}>
                <LogOut size={18} aria-hidden="true" />
                Logout
              </button>
              <button className="btn-primary" onClick={() => setActiveTask(emptyTask)}>
                <Plus size={18} aria-hidden="true" />
                New task
              </button>
            </div>
          </header>

          {(!isSupabaseConfigured || !isFirebaseConfigured) && (
            <div className="mt-5 rounded-lg border border-redbrand/25 bg-redbrand/10 p-4 text-sm text-navy">
              <strong>Setup notice:</strong> add Firebase and Supabase values to `.env` to switch from local demo
              mode to cloud mode.
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-redbrand/25 bg-redbrand/10 p-4 text-sm text-redbrand">
              {error}
            </div>
          )}

          {toast && (
            <div
              className="fixed bottom-5 right-5 z-50 rounded-lg bg-navy px-4 py-3 text-sm font-medium text-white shadow-soft"
              role="status"
            >
              {toast}
            </div>
          )}

          <section
            ref={dashboardRef}
            className="scroll-mt-5 mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Task reporting summary"
          >
            <StatCard icon={<CheckCircle2 size={20} />} label="Total tasks" value={stats.total} />
            <StatCard icon={<BarChart3 size={20} />} label="Completed" value={stats.completed} />
            <StatCard icon={<Clock3 size={20} />} label="Due in 24h" value={stats.dueSoon} />
            <StatCard icon={<AlertTriangle size={20} />} label="Overdue" value={stats.overdue} danger />
          </section>

          <section ref={tasksRef} className="scroll-mt-5 mt-5 rounded-lg bg-white p-4 shadow-soft ring-1 ring-navy/15">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-redbrand">Tasks</p>
                <h3 className="text-xl font-bold">Task list</h3>
              </div>
              <button className="btn-secondary justify-center" onClick={() => setActiveTask(emptyTask)}>
                <Plus size={18} aria-hidden="true" />
                Add task
              </button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_170px_170px]">
              <label className="relative block">
                <span className="sr-only">Search tasks</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy/45"
                  size={18}
                  aria-hidden="true"
                />
                <input
                  className="input pl-10"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, notes, assignee, or creator"
                />
              </label>
              <Select value={statusFilter} onChange={setStatusFilter} label="Status filter">
                <option value="all">All status</option>
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </Select>
              <Select value={priorityFilter} onChange={setPriorityFilter} label="Priority filter">
                <option value="all">All priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-navy/15">
            {loadingTasks ? (
              <div className="grid min-h-64 place-items-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-redbrand border-t-transparent" />
              </div>
            ) : filteredTasks.length ? (
              <div className="divide-y divide-navy/10">
                {filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={() => setActiveTask(task)}
                    onDelete={() => handleDelete(task.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState onCreate={() => setActiveTask(emptyTask)} />
            )}
          </section>

          <section
            ref={collaborationRef}
            className="scroll-mt-5 mt-5 rounded-lg bg-white p-5 shadow-soft ring-1 ring-navy/15"
            aria-labelledby="collaboration-heading"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-redbrand">Collaboration</p>
                <h3 id="collaboration-heading" className="text-xl font-bold">
                  Shared work
                </h3>
                <p className="mt-1 text-sm text-navy/70">
                  Tasks with assignees or collaborators appear here for quick team follow-up.
                </p>
              </div>
              <span className="inline-flex rounded-full bg-redbrand/10 px-3 py-1 text-sm font-semibold text-redbrand ring-1 ring-redbrand/20">
                {collaborativeTasks.length} active
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {collaborativeTasks.length ? (
                collaborativeTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="rounded-lg border border-navy/10 p-4">
                    <p className="font-semibold">{task.title}</p>
                    <p className="mt-2 text-sm text-navy/65">
                      {task.assigned_to ? `Assigned to ${task.assigned_to}` : 'No assignee'}
                    </p>
                    {task.shared_with && (
                      <p className="mt-1 text-sm text-navy/65">Shared with {task.shared_with}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-navy/20 p-4 text-sm text-navy/65 md:col-span-2">
                  No collaborative tasks yet. Add an assignee or collaborator on a task to track team work here.
                </p>
              )}
            </div>
          </section>

          <section
            ref={staffRef}
            className="scroll-mt-5 mt-5 rounded-lg bg-white p-5 shadow-soft ring-1 ring-navy/15"
            aria-labelledby="staff-heading"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-redbrand">
                  {isAdmin ? 'Admin enabled' : 'Staff view'}
                </p>
                <h3 id="staff-heading" className="text-xl font-bold">
                  {user.displayName || user.email}
                </h3>
                <p className="mt-1 text-sm text-navy/70">
                  {isAdmin
                    ? 'You can view reporting data across staff tasks.'
                    : 'This view summarizes the tasks connected to your account.'}
                </p>
              </div>
              <button className="btn-secondary justify-center" onClick={() => setAccountOpen((current) => !current)}>
                Account details
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Created by you" value={staffStats.createdByMe} />
              <MiniStat label="Assigned to you" value={staffStats.assignedToMe} />
              <MiniStat label="Shared with you" value={staffStats.sharedWithMe} />
            </div>
          </section>
        </section>
      </div>

      {activeTask && (
        <TaskModal
          task={activeTask}
          user={user}
          onClose={() => setActiveTask(null)}
          onSaved={(savedTask) => {
            setTasks((current) => {
              const exists = current.some((task) => task.id === savedTask.id);
              return exists ? current.map((task) => (task.id === savedTask.id ? savedTask : task)) : [savedTask, ...current];
            });
            setActiveTask(null);
            setToast('Task saved.');
          }}
          onError={(message) => setError(message)}
        />
      )}
    </main>
  );
}

function TaskModal({ task, user, onClose, onSaved, onError }) {
  const [form, setForm] = useState(() => ({
    ...task,
    deadline: toDateTimeLocal(task.deadline),
    reminder_at: toDateTimeLocal(task.reminder_at),
  }));
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const savedTask = await saveTask({ task: form, user, attachmentFile });
      onSaved(savedTask);
    } catch (err) {
      onError(err.message || 'Could not save task.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-navy/65 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 text-navy shadow-soft ring-1 ring-navy/15"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{form.id ? 'Edit task' : 'Create task'}</h2>
            <p className="mt-1 text-sm text-navy/70">
              Assign work, set deadlines, add reminders, and attach supporting files.
            </p>
          </div>
          <IconButton label="Close task form" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>

        <TextInput
          id="task-title"
          label="Task title"
          value={form.title}
          onChange={(value) => setForm({ ...form, title: value })}
          required
        />

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold text-navy">Description</span>
          <textarea
            className="input min-h-28 resize-y"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Add details, context, or acceptance criteria"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })}>
            <option value="todo">To do</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
          <Select label="Priority" value={form.priority} onChange={(value) => setForm({ ...form, priority: value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
          <TextInput
            id="assigned-to"
            label="Assigned to"
            type="email"
            value={form.assigned_to}
            onChange={(value) => setForm({ ...form, assigned_to: value })}
            placeholder="staff@example.com"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="deadline"
            label="Deadline"
            type="datetime-local"
            value={form.deadline || ''}
            onChange={(value) => setForm({ ...form, deadline: value })}
          />
          <TextInput
            id="reminder"
            label="Reminder time"
            type="datetime-local"
            value={form.reminder_at || ''}
            onChange={(value) => setForm({ ...form, reminder_at: value })}
          />
        </div>

        <TextInput
          id="shared-with"
          label="Collaborators"
          value={form.shared_with}
          onChange={(value) => setForm({ ...form, shared_with: value })}
          placeholder="Comma-separated email addresses"
        />

        <label className="mb-5 block rounded-lg border border-dashed border-navy/25 p-4 text-sm">
          <span className="mb-2 flex items-center gap-2 font-semibold text-navy">
            <FileUp size={18} aria-hidden="true" />
            Attachment
          </span>
          <input
            className="block w-full text-sm text-navy/70 file:mr-4 file:rounded-md file:border-0 file:bg-redbrand/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-redbrand hover:file:bg-redbrand/15"
            type="file"
            onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)}
          />
          {form.attachment_name && <span className="mt-2 block text-navy/60">Current: {form.attachment_name}</span>}
        </label>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary justify-center" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary justify-center" disabled={submitting || !form.title.trim()}>
            {submitting ? 'Saving...' : 'Save task'}
          </button>
        </div>
      </form>
    </div>
  );
}

function TaskRow({ task, onEdit, onDelete }) {
  return (
    <article className="grid gap-4 p-4 transition hover:bg-redbrand/5 lg:grid-cols-[1fr_170px_132px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-navy">{task.title}</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${priorityStyles[task.priority]}`}>
            {task.priority}
          </span>
          {isOverdue(task) && (
            <span className="rounded-full bg-redbrand/10 px-2.5 py-1 text-xs font-semibold text-redbrand ring-1 ring-redbrand/25">
              Overdue
            </span>
          )}
        </div>
        {task.description && <p className="mt-2 line-clamp-2 text-sm text-navy/70">{task.description}</p>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-navy/60">
          <span>Due: {formatDate(task.deadline)}</span>
          {task.assigned_to && <span>Assigned: {task.assigned_to}</span>}
          {task.attachment_url && (
            <a className="font-medium text-redbrand hover:underline" href={task.attachment_url} target="_blank" rel="noreferrer">
              {task.attachment_name || 'Attachment'}
            </a>
          )}
        </div>
      </div>
      <div>
        <span className="inline-flex rounded-full bg-navy/8 px-3 py-1 text-sm font-semibold text-navy">
          {statusLabels[task.status]}
        </span>
      </div>
      <div className="flex gap-2 lg:justify-end">
        <IconButton label={`Edit ${task.title}`} onClick={onEdit}>
          <Pencil size={18} />
        </IconButton>
        <IconButton label={`Delete ${task.title}`} onClick={onDelete} danger>
          <Trash2 size={18} />
        </IconButton>
      </div>
    </article>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-redbrand/10 text-redbrand">
          <CheckCircle2 size={24} aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-lg font-bold">No tasks found</h3>
        <p className="mt-2 max-w-md text-sm text-navy/70">
          Create a task or adjust the filters to view staff assignments, reminders, and deadlines.
        </p>
        <button className="btn-primary mx-auto mt-5" onClick={onCreate}>
          <Plus size={18} aria-hidden="true" />
          New task
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, danger = false }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-navy/15">
      <div className={`mb-4 grid h-10 w-10 place-items-center rounded-lg ${danger ? 'bg-redbrand text-white' : 'bg-redbrand/10 text-redbrand'}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-navy/60">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

function TextInput({ id, label, value, onChange, type = 'text', ...props }) {
  return (
    <label className="mb-4 block" htmlFor={id}>
      <span className="mb-1 block text-sm font-semibold text-navy">{label}</span>
      <input id={id} className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-navy">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function IconButton({ label, onClick, children, danger = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-11 w-11 place-items-center rounded-md ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        danger
          ? 'text-redbrand ring-redbrand/25 hover:bg-redbrand/10 focus-visible:outline-redbrand'
          : 'text-navy ring-navy/20 hover:bg-redbrand/10 focus-visible:outline-redbrand'
      }`}
    >
      {children}
    </button>
  );
}

function NavItem({ icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        active ? 'bg-white text-navy shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-navy/10 p-4">
      <p className="text-sm font-medium text-navy/60">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function FeaturePill({ icon, label }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white p-3 text-sm font-semibold shadow-soft ring-1 ring-navy/15">
      <span className="text-redbrand">{icon}</span>
      {label}
    </div>
  );
}

export default App;
