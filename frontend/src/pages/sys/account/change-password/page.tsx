import { useEffect, useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { authenticatedFetch } from '../../../../lib/http';
import { useI18n, usePageHeader, useToast } from '../../../../contexts';

function evaluatePasswordPolicy(input: { email?: string; newPassword: string }) {
  const errors: string[] = [];
  const pwd = input.newPassword;

  if (pwd.trim() !== pwd) errors.push('trim');
  if (/\s/.test(pwd)) errors.push('whitespace');
  if (pwd.length < 12) errors.push('minLen');
  if (pwd.length > 72) errors.push('maxLen');

  const lower = /[a-z]/.test(pwd);
  const upper = /[A-Z]/.test(pwd);
  const digit = /\d/.test(pwd);
  const special = /[^a-zA-Z0-9]/.test(pwd);
  const categories = [lower, upper, digit, special].filter(Boolean).length;
  if (categories < 3) errors.push('categories');

  const email = input.email;
  if (email && typeof email === 'string') {
    const local = email.split('@')[0] || '';
    if (local && local.length >= 3) {
      if (pwd.toLowerCase().includes(local.toLowerCase())) errors.push('emailPrefix');
    }
  }

  return errors;
}

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const { setPageHeader } = usePageHeader();
  const { showToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setPageHeader(t('account.changePassword.title'), t('account.changePassword.subtitle'));
  }, [setPageHeader, t]);

  const policyErrors = useMemo(() => evaluatePasswordPolicy({ newPassword }), [newPassword]);

  const canSubmit = useMemo(() => {
    if (isSaving) return false;
    if (!newPassword || !confirmPassword) return false;
    if (newPassword !== confirmPassword) return false;
    if (policyErrors.length) return false;
    return true;
  }, [confirmPassword, isSaving, newPassword, policyErrors.length]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const resp = await authenticatedFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword || undefined,
          new_password: newPassword
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) {
        showToast(data?.error || t('account.changePassword.error'), 'error');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(t('account.changePassword.success'), 'success');
    } catch {
      showToast(t('account.changePassword.error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPolicyHint = (code: string) => {
    const map: Record<string, string> = {
      trim: t('account.changePassword.policy.trim'),
      whitespace: t('account.changePassword.policy.whitespace'),
      minLen: t('account.changePassword.policy.minLen'),
      maxLen: t('account.changePassword.policy.maxLen'),
      categories: t('account.changePassword.policy.categories'),
      emailPrefix: t('account.changePassword.policy.emailPrefix')
    };
    return map[code] || code;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('account.changePassword.formTitle')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('account.changePassword.formDesc')}</div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('account.changePassword.current')}</label>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder={t('account.changePassword.currentPlaceholder')}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('account.changePassword.currentTip')}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('account.changePassword.new')}</label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder={t('account.changePassword.newPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('account.changePassword.confirm')}</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder={t('account.changePassword.confirmPlaceholder')}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <div className="text-xs text-red-600 dark:text-red-400">{t('account.changePassword.mismatch')}</div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-3">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('account.changePassword.policyTitle')}</div>
            <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {policyErrors.length === 0 ? (
                <li className="text-emerald-600 dark:text-emerald-400">{t('account.changePassword.policy.ok')}</li>
              ) : (
                policyErrors.map((e) => <li key={e}>- {renderPolicyHint(e)}</li>)
              )}
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('account.changePassword.saving') : t('account.changePassword.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
