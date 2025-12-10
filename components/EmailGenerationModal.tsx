import React, { useEffect, useState } from 'react';
import { X, Mail, TrendingUp, FileText, Send, CheckCircle, BarChart2, Link as LinkIcon, PlayCircle } from 'lucide-react';
import { VideoData } from '../services/youtubeService';
// import { generateEmailOpenAI } from '../services/openaiService'; // Disabled for now
import { getLists, sendCampaign, getReports, ACList, ACCampaign } from '../services/activeCampaignService';

interface EmailGenerationModalProps {
    video: VideoData | null;
    isOpen: boolean;
    onClose: () => void;
}

export const EmailGenerationModal: React.FC<EmailGenerationModalProps> = ({ video, isOpen, onClose }) => {
    // Steps: 'editing' (default now), 'sending', 'success'
    const [emailStep, setEmailStep] = useState<'editing' | 'sending' | 'success'>('editing');
    const [emailData, setEmailData] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
    const [acLists, setAcLists] = useState<ACList[]>([]);
    const [selectedList, setSelectedList] = useState<string>('all');
    const [campaignReports, setCampaignReports] = useState<ACCampaign[]>([]);
    const [testEmail, setTestEmail] = useState<string>('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    useEffect(() => {
        if (isOpen && video) {
            loadEmailData();
            // Pre-fill with template instead of AI generation
            setEmailData({
                subject: `Novo Vídeo: ${video.title}`,
                body: `Olá,\n\nAcabei de publicar um novo vídeo no canal: <b>${video.title}</b>\n\n${video.description ? video.description.substring(0, 150) + '...' : ''}\n\n<a href="https://www.youtube.com/watch?v=${video.id}" style="display: inline-block; background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Assistir Agora</a>\n\nEspero que goste!\n\nAbraços.`
            });
            setEmailStep('editing');
        }
    }, [isOpen, video]);

    const loadEmailData = async () => {
        const lists = await getLists();
        setAcLists(lists);
        const reports = await getReports();
        setCampaignReports(reports);
    };

    const handleSendCampaign = async () => {
        if (!confirm("Tem certeza que deseja enviar esta campanha para a lista selecionada?")) return;

        setEmailStep('sending');
        try {
            await sendCampaign(emailData.subject, emailData.body, selectedList);
            setEmailStep('success');
            loadEmailData(); // Refresh reports
        } catch (error) {
            console.error("Error sending campaign:", error);
            setEmailStep('editing');
            alert("Erro ao enviar campanha. Verifique o console.");
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) {
            alert("Digite um email para teste.");
            return;
        }
        setIsSendingTest(true);
        try {
            // Call backend to send test email
            const BACKEND_URL = 'https://yt-dashboard-backend.vercel.app/api/active-campaign';
            const res = await fetch(`${BACKEND_URL}/send-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: `[TESTE] ${emailData.subject}`,
                    body: emailData.body,
                    emailTo: testEmail
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || err.error || "Erro desconhecido ao enviar teste");
            }

            alert(`Email de teste enviado para ${testEmail}!`);
        } catch (error: any) {
            console.error("Error sending test email:", error);
            alert(`Erro ao enviar teste: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsSendingTest(false);
        }
    };

    const insertLink = () => {
        if (!video) return;
        const linkHtml = `<a href="https://www.youtube.com/watch?v=${video.id}">Assistir Vídeo</a>`;
        setEmailData(prev => ({ ...prev, body: prev.body + '\n' + linkHtml }));
    };

    const insertButton = () => {
        if (!video) return;
        const btnHtml = `<br><br><a href="https://www.youtube.com/watch?v=${video.id}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">🔴 ASSISTIR VÍDEO AGORA</a><br><br>`;
        setEmailData(prev => ({ ...prev, body: prev.body + '\n' + btnHtml }));
    };

    if (!isOpen || !video) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Mail className="text-blue-600" size={24} />
                            Email Marketing (Manual)
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Divulgue "{video.title}"
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1">

                    {emailStep === 'editing' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                            {/* Left Column: Editor */}
                            <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assunto do Email</label>
                                    <input
                                        type="text"
                                        value={emailData.subject}
                                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                                        placeholder="Digite um assunto chamativo..."
                                    />
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Corpo do Email (HTML)</label>
                                        <div className="flex gap-2">
                                            <button onClick={insertLink} className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                                <LinkIcon size={12} /> Link
                                            </button>
                                            <button onClick={insertButton} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                                <PlayCircle size={12} /> Botão Vídeo
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={emailData.body}
                                        onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                                        className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono text-sm leading-relaxed resize-none min-h-[300px]"
                                        placeholder="Escreva seu email aqui. Você pode usar tags HTML simples como <b>negrito</b>, <br> quebra de linha, etc."
                                    />
                                </div>
                            </div>

                            {/* Right Column: Settings & Test */}
                            <div className="space-y-8 flex flex-col">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Send size={18} className="text-green-600" />
                                        Envio Oficial
                                    </h3>

                                    <div className="mb-4">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Lista de Destinatários</label>
                                        <select
                                            value={selectedList}
                                            onChange={(e) => setSelectedList(e.target.value)}
                                            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                                        >
                                            <option value="all">Todas as Listas</option>
                                            {acLists.map(list => (
                                                <option key={list.id} value={list.id}>{list.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        onClick={handleSendCampaign}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                    >
                                        <Send size={18} />
                                        Enviar Campanha Real
                                    </button>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Mail size={18} className="text-blue-600" />
                                        Teste de Envio
                                    </h3>

                                    <div className="mb-4">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Email de Teste</label>
                                        <input
                                            type="email"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSendTest}
                                        disabled={isSendingTest}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-md"
                                    >
                                        {isSendingTest ? (
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        ) : (
                                            <Send size={16} />
                                        )}
                                        Enviar Teste
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {emailStep === 'sending' && (
                        <div className="text-center py-20 h-full flex flex-col items-center justify-center">
                            <div className="w-20 h-20 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Enviando campanha...</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-lg">Conectando ao ActiveCampaign.</p>
                        </div>
                    )}

                    {emailStep === 'success' && (
                        <div className="text-center py-20 h-full flex flex-col items-center justify-center">
                            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-8">
                                <CheckCircle size={48} />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Sucesso!</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto text-lg">
                                Sua campanha foi criada e agendada com sucesso no ActiveCampaign.
                            </p>
                            <button
                                onClick={onClose}
                                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-10 py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-lg"
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Reports */}
                {campaignReports.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <BarChart2 size={14} />
                            Últimas Campanhas
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-slate-400 uppercase">
                                    <tr>
                                        <th className="px-2 py-1">Campanha</th>
                                        <th className="px-2 py-1">Status</th>
                                        <th className="px-2 py-1">Envio</th>
                                        <th className="px-2 py-1">Opens</th>
                                        <th className="px-2 py-1">Clicks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaignReports.slice(0, 3).map((campaign) => (
                                        <tr key={campaign.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <td className="px-2 py-1 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap truncate max-w-[150px]">
                                                {campaign.name}
                                            </td>
                                            <td className="px-2 py-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${campaign.status === '1' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {campaign.status === '1' ? 'Agendado' : 'Enviado'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1">{new Date(campaign.sdate).toLocaleDateString()}</td>
                                            <td className="px-2 py-1">{campaign.uniqueopens || '-'}</td>
                                            <td className="px-2 py-1">{campaign.linkclicks || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
