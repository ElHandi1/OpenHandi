import express from 'express';
import { supabase } from '../supabase.js';
import { callLLM } from '../llm.js';

const router = express.Router();
const CONTEXT_WINDOW = parseInt(process.env.CONTEXT_WINDOW || '20', 10);

// Verify Token Endpoint
router.get('/verify', (req, res) => {
  res.json({ valid: true });
});

// --- Sessions ---
router.get('/sessions', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('sessions').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/sessions', async (req, res, next) => {
  try {
    const { title } = req.body;
    const { data, error } = await supabase.from('sessions').insert({ title: title || 'New Conversation' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.delete('/sessions/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('sessions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Chat ---
router.post('/', async (req, res, next) => {
  try {
    let { message, session_id } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Auto-create session if none provided
    if (!session_id) {
       const { data: newSession } = await supabase.from('sessions').insert({ title: message.substring(0, 30) + '...' }).select().single();
       session_id = newSession.id;
    } else {
       await supabase.from('sessions').update({ updated_at: new Date().toISOString() }).eq('id', session_id);
    }

    // 1. Save user msg
    const { error: userErr } = await supabase.from('messages').insert({ role: 'user', content: message, session_id });
    if (userErr) throw userErr;

    // 2. Fetch context
    const { data: history, error: histErr } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(CONTEXT_WINDOW);

    if (histErr) throw histErr;
    history.reverse();

    // 3. Prepare payload
    const messagesPayload = [
      { role: 'system', content: 'You are OpenHandi, a highly capable persistent personal assistant. You manage tasks and help the user efficiently. Always respond entirely in Spanish. Never use Chinese characters.' },
      ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    // 4. Call Model
    const assistantMsg = await callLLM(messagesPayload);

    // 5. Save assistant msg
    const { error: asstErr } = await supabase.from('messages').insert({ role: 'assistant', content: assistantMsg.content, session_id });
    if (asstErr) throw asstErr;

    res.json({ response: assistantMsg.content, session_id });
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });
    
    const { data: history, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    res.json(history);
  } catch (error) {
    next(error);
  }
});

export default router;
