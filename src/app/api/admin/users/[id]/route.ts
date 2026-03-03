
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { withApiErrorHandling } from '@/lib/api-wrapper';

export const PUT = withApiErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();
    const { full_name, roles, status } = body;

    const supabase = getSupabaseForRequest(req);
    
    // 1. 更新 public.users 表 (基础角色数组)
    // 映射 RBAC role code 到基础 user_role 枚举，避免数据库报错
    const enumRoles = (roles || []).map((r: string) => {
        const lower = r.toLowerCase();
        // 映射逻辑：
        // 1. 包含 admin 的角色映射为基础 admin
        // 2. operator, editor 映射为 editor
        // 3. auditor, viewer 映射为 viewer
        // 4. 其他映射为 user
        if (lower.includes('admin')) return 'admin';
        if (lower.includes('editor') || lower === 'operator') return 'editor';
        if (lower.includes('viewer') || lower === 'auditor') return 'viewer';
        return 'user';
    });

    const { data, error } = await supabase
      .from('users')
      .update({ 
          full_name, 
          roles: Array.from(new Set(enumRoles)), // 去重
          status 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 2. 同步更新 RBAC 系统 (admin_user_roles 表)
    if (roles && Array.isArray(roles)) {
        // 先删除该用户现有的所有角色关联 (简单起见，实际生产中可能需要更精细的操作)
        await supabase
            .from('admin_user_roles')
            .delete()
            .eq('user_id', id);

        // 查找对应的 admin_roles 并插入关联
        // 注意：这里假设 roles 数组里的 code 对应 admin_roles 表里的 code
        const { data: adminRoles } = await supabase
            .from('admin_roles')
            .select('id, code')
            .in('code', roles); // 直接使用前端传来的 code (通常是小写)

        if (adminRoles && adminRoles.length > 0) {
            const roleAssignments = adminRoles.map(role => ({
                user_id: id,
                role_id: role.id,
                // 默认分配为全局权限 (app_id 为 NULL)
                app_id: null 
            }));

            await supabase
                .from('admin_user_roles')
                .insert(roleAssignments);
        }
    }

    return NextResponse.json(data);
});

export const DELETE = withApiErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const supabase = getSupabaseForRequest(req);

    // 1. Delete from auth.users (this will cascade to public.users usually, or we do both)
    // Using admin auth client
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    // 2. Ideally public.users row is deleted via cascade or trigger. 
    // If not, we manually delete it to be safe.
    const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (dbError) console.warn('Failed to delete public user record (might have been cascaded):', dbError.message);

    return new NextResponse(null, { status: 204 });
});
