import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { zh } from "./zh";

export const resources = {
  en: { translation: en },
  zh: { translation: zh }
};

const formatMissingKey = (key: string, lang: string) => {
  const parts = key.split('.').filter(Boolean);
  const generic = new Set(['title', 'subtitle', 'desc', 'description', 'placeholder', 'placeholders', 'label', 'labels', 'table', 'form', 'messages', 'errors', 'stats', 'actions', 'status']);
  const pick = (() => {
    const last = parts[parts.length - 1];
    if (!last) return key;
    if (!generic.has(last)) return last;
    const prev = parts[parts.length - 2];
    return prev || last;
  })();

  const camelToWords = (s: string) =>
    s
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();

  const zhMap: Record<string, string> = {
    api: 'API',
    apps: '应用',
    coupons: '优惠券',
    webhooks: 'Webhooks',
    orders: '订单',
    products: '产品',
    users: '用户',
    skills: '技能',
    prompts: '提示词',
    audit: '审计',
    database: '数据库',
    identity: '身份与权限',
    agents: '智能体',
    aiGateway: 'AI 网关',
    integration: '集成',
    ailab: 'AI 实验室'
  };

  if (lang === 'zh') {
    const mapped = zhMap[pick] || zhMap[parts[0] || ''] || zhMap[parts[1] || ''];
    if (mapped) return mapped;
    return camelToWords(pick);
  }

  const words = camelToWords(pick);
  return words ? words[0].toUpperCase() + words.slice(1) : key;
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "zh", 
    fallbackLng: "en",
    returnNull: false,
    returnEmptyString: false,
    parseMissingKeyHandler: (key) => formatMissingKey(key, i18n.language || 'zh'),
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
export type Locale = 'en' | 'zh';
