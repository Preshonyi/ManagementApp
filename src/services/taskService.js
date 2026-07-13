import { isSupabaseConfigured, supabase } from '../lib/supabase';

const LOCAL_TASK_KEY = 'pcp_local_tasks';
const TASK_TABLE = 'tasks';
const STORAGE_BUCKET = 'task-attachments';

function readLocalTasks() {
  return JSON.parse(localStorage.getItem(LOCAL_TASK_KEY) || '[]');
}

function writeLocalTasks(tasks) {
  localStorage.setItem(LOCAL_TASK_KEY, JSON.stringify(tasks));
}

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    deadline: task.deadline || '',
    reminder_at: task.reminder_at || '',
    assigned_to: task.assigned_to || '',
    shared_with: task.shared_with || '',
    attachment_url: task.attachment_url || '',
    attachment_name: task.attachment_name || '',
    created_by: task.created_by,
    created_by_email: task.created_by_email,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

export async function fetchTasks({ user, isAdmin }) {
  if (!isSupabaseConfigured) {
    const localTasks = readLocalTasks();
    return isAdmin
      ? localTasks
      : localTasks.filter(
          (task) =>
            task.created_by === user.uid ||
            task.assigned_to === user.email ||
            task.shared_with?.split(',').map((item) => item.trim()).includes(user.email),
        );
  }

  let query = supabase.from(TASK_TABLE).select('*').order('deadline', { ascending: true, nullsFirst: false });

  if (!isAdmin) {
    query = query.or(
      `created_by.eq.${user.uid},assigned_to.eq.${user.email},shared_with.ilike.%${user.email}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(normalizeTask);
}

export async function saveTask({ task, user, attachmentFile }) {
  const timestamp = new Date().toISOString();
  let attachmentPayload = {};

  if (attachmentFile) {
    attachmentPayload = await uploadAttachment({ file: attachmentFile, user });
  }

  if (!isSupabaseConfigured) {
    const tasks = readLocalTasks();
    const payload = normalizeTask({
      ...task,
      ...attachmentPayload,
      id: task.id || crypto.randomUUID(),
      created_by: task.created_by || user.uid,
      created_by_email: task.created_by_email || user.email,
      created_at: task.created_at || timestamp,
      updated_at: timestamp,
    });

    const nextTasks = task.id ? tasks.map((item) => (item.id === task.id ? payload : item)) : [payload, ...tasks];
    writeLocalTasks(nextTasks);
    return payload;
  }

  const payload = {
    title: task.title,
    description: task.description || null,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline || null,
    reminder_at: task.reminder_at || null,
    assigned_to: task.assigned_to || null,
    shared_with: task.shared_with || null,
    attachment_url: attachmentPayload.attachment_url || task.attachment_url || null,
    attachment_name: attachmentPayload.attachment_name || task.attachment_name || null,
    created_by: task.created_by || user.uid,
    created_by_email: task.created_by_email || user.email,
    updated_at: timestamp,
  };

  const query = task.id
    ? supabase.from(TASK_TABLE).update(payload).eq('id', task.id).select().single()
    : supabase
        .from(TASK_TABLE)
        .insert({ ...payload, created_at: timestamp })
        .select()
        .single();

  const { data, error } = await query;
  if (error) throw error;
  return normalizeTask(data);
}

export async function deleteTask(taskId) {
  if (!isSupabaseConfigured) {
    writeLocalTasks(readLocalTasks().filter((task) => task.id !== taskId));
    return;
  }

  const { error } = await supabase.from(TASK_TABLE).delete().eq('id', taskId);
  if (error) throw error;
}

export async function uploadAttachment({ file, user }) {
  if (!file) return {};

  if (!isSupabaseConfigured) {
    return {
      attachment_url: URL.createObjectURL(file),
      attachment_name: file.name,
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
  const path = `${user.uid}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return {
    attachment_url: data.publicUrl,
    attachment_name: file.name,
  };
}

export function subscribeToTasks(callback) {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('tasks-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TASK_TABLE }, () => callback())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
