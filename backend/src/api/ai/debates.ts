
import express from 'express';
import { DebateService } from '../../services/debateService.ts';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { requireAuth } from '../../middleware/auth.ts';

dotenv.config();

const router = express.Router();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const isAdminUser = async (userId: string) => {
  const { data, error } = await supabase.from('users').select('roles').eq('id', userId).single();
  if (error) return false;
  return Array.isArray((data as any)?.roles) && (data as any).roles.includes('admin');
};

router.use(requireAuth);

/**
 * @openapi
 * /api/ai/debates:
 *   get:
 *     tags: [AI Debates]
 *     summary: List debates
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of debates
 */
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id as string;
    const isAdmin = await isAdminUser(userId);

    let query = supabase
      .from('agent_debates')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/ai/debates/{id}:
 *   get:
 *     tags: [AI Debates]
 *     summary: Get debate details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Debate details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id as string;
    const isAdmin = await isAdminUser(userId);

    let debateQuery = supabase
      .from('agent_debates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null);

    if (!isAdmin) {
      debateQuery = debateQuery.eq('user_id', userId);
    }

    const { data: debate, error } = await debateQuery
      .single();
      
    if (error) throw error;
    
    // Fetch messages
    const { data: messages } = await supabase
      .from('debate_messages')
      .select('*')
      .eq('debate_id', id)
      .order('created_at', { ascending: true });
      
    res.json({ ...debate, messages: messages || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/ai/debates:
 *   post:
 *     tags: [AI Debates]
 *     summary: Create a debate
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topic]
 *             properties:
 *               topic:
 *                 type: string
 *               rounds:
 *                 type: integer
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Created debate
 */
router.post('/', async (req, res) => {
  try {
    const user_id = (req as any).user?.id; // From auth middleware
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { topic, mode, duration, entropy } = req.body;
    
    const debate = await DebateService.createDebate({
        topic,
        mode,
        duration,
        entropy,
        user_id
    });
    
    // Async start to not block response
    DebateService.startDebate(debate.id).catch(err => console.error('Start debate error:', err));
    
    res.status(201).json(debate);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/ai/debates/{id}/stop:
 *   post:
 *     tags: [AI Debates]
 *     summary: Stop a debate
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Debate stopped
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id as string;
    const isAdmin = await isAdminUser(userId);

    let canStopQuery = supabase
      .from('agent_debates')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null);
    if (!isAdmin) canStopQuery = canStopQuery.eq('user_id', userId);
    const { data: canStop, error: canStopError } = await canStopQuery.single();
    if (canStopError || !canStop) return res.status(404).json({ error: 'Not found' });

    await DebateService.stopDebate(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/ai/debates/{id}:
 *   delete:
 *     tags: [AI Debates]
 *     summary: Delete a debate
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Debate deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id as string;
    const isAdmin = await isAdminUser(userId);

    const nowIso = new Date().toISOString();
    let updateQuery = supabase
      .from('agent_debates')
      .update({ deleted_at: nowIso, updated_at: nowIso })
      .eq('id', id)
      .is('deleted_at', null);
    if (!isAdmin) updateQuery = updateQuery.eq('user_id', userId);

    const { data, error } = await updateQuery.select('id').single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
