import express from 'express';
import { supabase } from '../supabase.js';
import { callLLM } from '../llm.js';

const router = express.Router();
const CONTEXT_WINDOW = parseInt(process.env.CONTEXT_WINDOW || '20', 10);

router.post('/', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // 1. Save user message
    const { error: userErr } = await supabase.from('messages').insert({ role: 'user', content: message });
    if (userErr) throw userErr;

    // 2. Fetch context
    const { data: history, error: histErr } = await supabase
      .from('messages')
      .select('role, content')
      .order('created_at', { ascending: false })
      .limit(CONTEXT_WINDOW);

    if (histErr) throw histErr;

    // Supabase returns newest first due to order; reverse for chronological
    history.reverse();

    // 3. Prepare OpenRouter payload
    const messagesPayload = [
      { role: 'system', content: 'You are OpenHandi, a highly capable persistent personal assistant. You manage tasks and help the user efficiently.' },
      ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    // 4. Call LLM
    const assistantMsg = await callLLM(messagesPayload);

    // 5. Save assistant response
    const { error: asstErr } = await supabase.from('messages').insert({ role: 'assistant', content: assistantMsg.content });
    if (asstErr) throw asstErr;

    // 6. Return response
    res.json({ response: assistantMsg.content });
  } catch (error) {
    next(error);
  }
});

// Helper to get raw history if needed
router.get('/history', async (req, res, next) => {
  try {
    const { data: history, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    res.json(history);
  } catch (error) {
    next(error);
  }
});

export default router;
