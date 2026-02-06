export const account = {
  changePassword: {
    menu: '修改密码',
    title: '修改密码',
    subtitle: '更新你在后台系统中的登录密码。',
    formTitle: '账户安全',
    formDesc: '建议定期更换高强度密码，避免账号被盗。',
    current: '当前密码',
    currentPlaceholder: '如未设置过密码可留空',
    currentTip: '若你通过验证码登录且尚未设置过密码，可直接设置新密码。',
    new: '新密码',
    newPlaceholder: '请输入新密码',
    confirm: '确认新密码',
    confirmPlaceholder: '请再次输入新密码',
    mismatch: '两次输入的新密码不一致',
    policyTitle: '密码安全要求',
    policy: {
      ok: '密码强度符合要求',
      trim: '密码首尾不能包含空格',
      whitespace: '密码不能包含空白字符',
      minLen: '长度至少 12 位',
      maxLen: '长度最多 72 位',
      categories: '至少包含 3 类字符：小写/大写/数字/特殊符号',
      emailPrefix: '不能包含邮箱前缀'
    },
    submit: '保存修改',
    saving: '保存中...',
    success: '密码修改成功',
    error: '密码修改失败，请稍后重试'
  }
};

