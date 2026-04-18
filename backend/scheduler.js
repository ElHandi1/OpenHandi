import cron from 'node-cron';
import { supabase } from './supabase.js';

const activeJobs = new Map();

export async function initScheduler() {
  console.log('Initializing Scheduler...');
  
  // 1. Recover crashed tasks
  await recoverCrashedTasks();

  // 2. Load all enabled tasks
  const { data: tasks, error } = await supabase
    .from('cron_tasks')
    .select('*')
    .eq('enabled', true);

  if (error) {
    console.error('Failed to load cron tasks:', error);
    return;
  }

  tasks.forEach(task => scheduleTask(task));

  // 3. Keep-Alive Supabase Query (runs every 4 days)
  cron.schedule('0 0 */4 * *', async () => {
    console.log('Running Supabase Keep-Alive query...');
    await supabase.from('config').select('key').limit(1);
  });
}

export function scheduleTask(task) {
  // Cancel existing if rescheduling
  if (activeJobs.has(task.id)) {
    activeJobs.get(task.id).stop();
    activeJobs.delete(task.id);
  }

  if (!task.enabled) return;

  const job = cron.schedule(task.schedule, async () => {
    console.log(`Executing Cron Task: ${task.name}`);
    await executeTask(task.id);
  });

  activeJobs.set(task.id, job);
  console.log(`Scheduled task: ${task.name} with cron: ${task.schedule}`);
}

export function stopTask(taskId) {
  if (activeJobs.has(taskId)) {
    activeJobs.get(taskId).stop();
    activeJobs.delete(taskId);
  }
}

export async function executeTask(taskId) {
  try {
    // Set to running
    await supabase.from('cron_tasks').update({ last_status: 'running' }).eq('id', taskId);

    // Fetch latest task config
    const { data: task } = await supabase.from('cron_tasks').select('*').eq('id', taskId).single();
    if (!task) throw new Error('Task not found');

    // Simulate task execution (Here we could trigger an LLM tool call if required)
    // For this boilerplate, we log success
    const result = { success: true, message: `Task ${task.name} executed successfully.` };

    // Update log
    await supabase.from('cron_logs').insert({
      task_id: taskId,
      status: 'success',
      output: JSON.stringify(result)
    });

    // Update task
    await supabase.from('cron_tasks').update({
      last_run: new Date().toISOString(),
      last_status: 'success',
      // next_run could be calculated using cron-parser if needed
    }).eq('id', taskId);

  } catch (error) {
    console.error(`Task execution failed (${taskId}):`, error);
    await supabase.from('cron_logs').insert({
      task_id: taskId,
      status: 'error',
      error: error.message
    });
    await supabase.from('cron_tasks').update({ last_status: 'error' }).eq('id', taskId);
  }
}

async function recoverCrashedTasks() {
  const { data: runningTasks, error } = await supabase
    .from('cron_tasks')
    .select('id')
    .eq('last_status', 'running');

  if (!error && runningTasks && runningTasks.length > 0) {
    console.log(`Recovering ${runningTasks.length} crashed tasks...`);
    for (const task of runningTasks) {
      await supabase.from('cron_tasks').update({ last_status: 'error' }).eq('id', task.id);
      await supabase.from('cron_logs').insert({
        task_id: task.id,
        status: 'error',
        error: 'Task crashed mid-execution during server restart.'
      });
    }
  }
}
