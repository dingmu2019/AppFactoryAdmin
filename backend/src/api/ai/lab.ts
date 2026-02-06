import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { AILabService } from '../../services/aiLabService.ts';

const router = express.Router();

// Initialize Supabase Client for Auth checks (if needed beyond middleware)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @openapi
 * /api/ai/lab/sessions:
 *   post:
 *     tags: [AI Lab]
 *     summary: Create a new lab session
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, mode]
 *             properties:
 *               title:
 *                 type: string
 *               mode:
 *                 type: string
 *               description:
 *                 type: string
 *               entropy:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created session
 */
router.post('/sessions', async (req, res) => {
    try {
        const { title, mode, description, entropy } = req.body;
        
        // In a real app, get user_id from req.user (auth middleware)
        // For MVP, we might need to trust the client or use a test user if auth is bypassed
        // Assuming auth middleware populates req.user or we extract from header
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });

        const session = await AILabService.createSession({
            title,
            mode,
            description,
            entropy,
            user_id: user.id
        });

        res.status(201).json(session);
    } catch (error: any) {
        console.error('Create Session Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/ai/lab/sessions:
 *   get:
 *     tags: [AI Lab]
 *     summary: List sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of sessions
 */
router.get('/sessions', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        const token = authHeader.split(' ')[1];
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('ai_lab_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/ai/lab/sessions/{id}:
 *   get:
 *     tags: [AI Lab]
 *     summary: Get session details
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
 *         description: Session details
 */
router.get('/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch Session
        const { data: session, error: sessionError } = await supabase
            .from('ai_lab_sessions')
            .select('*')
            .eq('id', id)
            .single();
        
        if (sessionError) throw sessionError;

        // Fetch Messages
        const { data: messages } = await supabase
            .from('ai_lab_messages')
            .select('*')
            .eq('session_id', id)
            .order('round_index', { ascending: true });

        // Fetch Artifacts
        const { data: artifacts } = await supabase
            .from('ai_lab_artifacts')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: false });

        res.json({ session, messages, artifacts });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
