import express from 'express';
import { supabase } from '../supabase.js';
import { scheduleTask, stopTask, executeTask } from '../scheduler.js';

const router = express.Router();

// GET all tasks
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('cron_tasks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST new task
router.post('/', async (req, res, next) => {
  try {
    const { name, description, schedule } = req.body;
    const { data: task, error } = await supabase.from('cron_tasks').insert({
      name,
      description,
      schedule,
      enabled: true,
      last_status: 'pending'
    }).select().single();

    if (error) throw error;
    
    scheduleTask(task);
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// PATCH task
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data: task, error } = await supabase.from('cron_tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;

    if (task.enabled) {
      scheduleTask(task);
    } else {
      stopTask(id);
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// DELETE task
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    stopTask(id);
    const { error } = await supabase.from('cron_tasks').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST trigger task immediately
router.post('/:id/run', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Don't await full execution, let it run in background to free the request
    executeTask(id);
    res.json({ success: true, message: 'Execution started' });
  } catch (error) {
    next(error);
  }
});

// GET task logs
router.get('/:id/logs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('cron_logs')
      .select('*')
      .eq('task_id', id)
      .order('executed_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
