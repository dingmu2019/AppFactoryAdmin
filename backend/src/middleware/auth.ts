import type { Request, Response, NextFunction } from 'express';

// Middleware to require authentication (any valid logged-in user)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Please login first' });
  }
  next();
};

// Middleware to require Admin role
// Assumes extractUser middleware has already run and populated req.user
// Also assumes we might need to fetch the user's role from DB if not in JWT
// But for now, let's rely on what we can get. 
// Since extractUser only gets id and email, we might need to query the DB here if roles are not in JWT.
// However, querying DB on every request is slow. 
// Ideally, roles should be in JWT user_metadata.
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Please login first' });
  }

  try {
    // 1. Check JWT metadata first (Fastest)
    // But req.user from extractUser is just { id, email }, we don't have the full session/jwt object there easily unless we change extractUser.
    // Let's query public.users to be safe and accurate.
    
    const { data: user, error } = await supabase
      .from('users')
      .select('roles')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(403).json({ error: 'Forbidden: User not found or error checking permissions' });
    }

    const isAdmin = user.roles && Array.isArray(user.roles) && user.roles.includes('admin');
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    (res.locals as any).isAdmin = true;
    next();
  } catch (err) {
    console.error('Error in requireAdmin:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
