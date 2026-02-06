export const account = {
  changePassword: {
    menu: 'Change Password',
    title: 'Change Password',
    subtitle: 'Update your admin console login password.',
    formTitle: 'Account Security',
    formDesc: 'Use a strong password and rotate it regularly.',
    current: 'Current Password',
    currentPlaceholder: 'Leave blank if not set yet',
    currentTip: 'If you logged in via email code and never set a password, you can set a new one directly.',
    new: 'New Password',
    newPlaceholder: 'Enter a new password',
    confirm: 'Confirm New Password',
    confirmPlaceholder: 'Re-enter the new password',
    mismatch: 'Passwords do not match',
    policyTitle: 'Password Policy',
    policy: {
      ok: 'Password meets requirements',
      trim: 'Password must not start or end with whitespace',
      whitespace: 'Password must not contain whitespace',
      minLen: 'At least 12 characters',
      maxLen: 'At most 72 characters',
      categories: 'Include at least 3 types: lower/upper/number/special',
      emailPrefix: 'Must not include email prefix'
    },
    submit: 'Save',
    saving: 'Saving...',
    success: 'Password updated',
    error: 'Failed to update password'
  }
};

