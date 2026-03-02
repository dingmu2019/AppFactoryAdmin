import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Code2, Download, Copy, Terminal, Check } from 'lucide-react';
import { toast } from "sonner";

interface ClientSdkProps {
  t: any;
}

const SdkCard = ({ t, lang, version, cmd, color, onDownload }: any) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(cmd);
        setCopied(true);
        toast.success(t('api.sdks.commandCopied'));
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`p-5 rounded-lg border border-${color}-200 dark:border-${color}-800 bg-${color}-50/30 dark:bg-${color}-900/10 flex flex-col gap-4 transition-all hover:shadow-lg`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/40 text-${color}-600 dark:text-${color}-400`}>
                        <Terminal size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-lg text-zinc-900 dark:text-white">{lang}</div>
                        <div className="text-xs font-mono text-zinc-500">v{version}</div>
                    </div>
                </div>
            </div>
            
            <div className="bg-zinc-900 text-zinc-200 p-3 rounded-lg font-mono text-xs break-all relative group shadow-inner">
                <div className="pr-8">{cmd}</div>
                <button 
                    onClick={handleCopy} 
                    className="absolute right-2 top-2 p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
            </div>

            <Button onClick={onDownload} variant="outline" className="w-full mt-auto bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <Download className="h-4 w-4 mr-2" />
                {t('api.sdks.downloadSource')}
            </Button>
        </div>
    );
};

export const ClientSdk: React.FC<ClientSdkProps> = ({ t }) => {
    const handleDownload = (lang: string) => {
        if (lang === 'ts') {
            window.open('/api/admin/sdk/download/ts', '_blank');
        } else {
            toast.info(t('api.sdks.comingSoon', { lang }));
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-900/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Code2 className="h-6 w-6 text-indigo-500" />
                        {t('api.sdks.title')}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {t('api.sdks.desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SdkCard 
                        t={t}
                        lang="TypeScript / Node.js" 
                        version="1.0.0" 
                        cmd="npm install @adminsys/sdk" 
                        color="blue" 
                        onDownload={() => handleDownload('ts')} 
                    />
                    <SdkCard 
                        t={t}
                        lang="Python" 
                        version="0.1.0" 
                        cmd="pip install adminsys-sdk" 
                        color="yellow" 
                        onDownload={() => handleDownload('py')} 
                    />
                    <SdkCard 
                        t={t}
                        lang="Java" 
                        version="0.1.0" 
                        cmd="mvn dependency:get -Dartifact=com.adminsys:sdk:1.0.0" 
                        color="red" 
                        onDownload={() => handleDownload('java')} 
                    />
                </CardContent>
            </Card>

            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-6">
                <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Terminal size={18} />
                    {t('api.sdks.howToUse.title')}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    {t('api.sdks.howToUse.desc')}
                </p>
                <pre className="bg-zinc-900 text-zinc-50 p-4 rounded-lg overflow-x-auto font-mono text-sm shadow-lg">
{`import { AdminSysClient } from './admin-sys-sdk';

const client = new AdminSysClient({
  baseUrl: 'https://api.your-saas.com',
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET
});

// Use strong-typed methods
const users = await client.getUsers({ page: 1, limit: 10 });
console.log(users);`}
                </pre>
            </div>
        </div>
    );
};
