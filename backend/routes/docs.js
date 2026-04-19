import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

// GET all docs
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('workspace_docs').select('id, title, updated_at').order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET single doc details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('workspace_docs').select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST create doc
router.post('/', async (req, res, next) => {
  try {
    const { title, content_markdown } = req.body;
    const { data, error } = await supabase.from('workspace_docs').insert({
      title: title || 'Nuevo Documento',
      content_markdown: content_markdown || ''
    }).select().single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// PATCH update doc
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content_markdown } = req.body;
    
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content_markdown !== undefined) updates.content_markdown = content_markdown;

    const { data, error } = await supabase.from('workspace_docs').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE doc
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('workspace_docs').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
