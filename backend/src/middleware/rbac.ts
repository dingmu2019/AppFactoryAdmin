import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

/**
 * RBAC Permission Check Middleware
 * @param permissionCode The required permission code (e.g. 'order.refund')
 * @returns Express Middleware
 */
export const requirePermission = (permissionCode: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized: Please login first' });
      }

      if ((res.locals as any).isAdmin === true) {
        return next();
      }

      // 1. Determine Scope (App Context)
      // Prioritize Header > Query Param > Body > URL Param
      const appId = (req.headers['x-app-id'] as string) || 
                    (req.query.appId as string) || 
                    req.body?.appId || 
                    req.params?.appId;

      // 2. Check Permissions via Database Function (or direct query)
      // Using direct query for transparency and control here, though RPC is cleaner.
      // We implement the logic of `has_permission` in TS to avoid db function dependency issues during dev.
      
      // Step A: Check if user is Super Admin (Global Scope)
      // A user with role 'super_admin' and app_id IS NULL has all permissions implicitly?
      // Or we strictly follow the role-permission mapping.
      // Let's query the `admin_user_roles` view/table.
      
      const userId = req.user.id;
      
      // Complex Query:
      // Check if user has a role that:
      // 1. Is assigned to user (globally OR for this app)
      // 2. Has the required permission
      
      const { data: userRoles, error: roleError } = await supabase
        .from('admin_user_roles')
        .select(`
          app_id,
          role:admin_roles!inner (
             permissions:admin_role_permissions!inner (
                permission:admin_permissions!inner (
                   code
                )
             )
          )
        `)
        .eq('user_id', userId);

      if (roleError) {
        console.error('RBAC Check Error:', roleError);
        return res.status(500).json({ error: 'Internal Server Error during permission check' });
      }

      // 3. Evaluate Logic
      let hasAccess = false;

      // Flatten permissions
      const rolesArray = Array.isArray(userRoles) ? userRoles : (userRoles ? [userRoles] : []);
      for (const ur of rolesArray as any[]) {
        // Check Scope Match
        // - Global Role (app_id is null) -> Applies to ALL apps
        // - App Role (app_id matches request) -> Applies only to this app
        const roleAppId = ur?.app_id ?? null;
        const isGlobalRole = roleAppId === null;
        const isMatchingAppRole = Boolean(appId) && roleAppId === appId;

        if (isGlobalRole || isMatchingAppRole) {
           // Check Permission Code
           const perms = Array.isArray(ur?.role?.permissions) ? ur.role.permissions : [];
           const hasCode = perms.some((p: any) => p?.permission?.code === permissionCode);
           
           if (hasCode) {
             hasAccess = true;
             break;
           }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          required: permissionCode,
          scope: appId || 'global'
        });
      }

      next();
    } catch (err) {
      console.error('RBAC Middleware Error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};
