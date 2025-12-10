import React, { useEffect, useState } from 'react';
import { X, Mail, TrendingUp, FileText, Send, CheckCircle, BarChart2 } from 'lucide-react';
import { VideoData } from '../services/youtubeService';
import { generateEmailOpenAI } from '../services/openaiService';
import { getLists, sendCampaign, getReports, ACList, ACCampaign } from '../services/activeCampaignService';

interface EmailGenerationModalProps {
    video: VideoData | null;
    isOpen: boolean;
    onClose: () => void;
}

export const EmailGenerationModal: React.FC<EmailGenerationModalProps> = ({ video, isOpen, onClose }) => {
    const [emailStep, setEmailStep] = useState<'initial' | 'generating' | 'editing' | 'sending' | 'success'>('initial');
    const [emailData, setEmailData] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
    const [acLists, setAcLists] = useState<ACList[]>([]);
    const [selectedList, setSelectedList] = useState<string>('all');
    const [campaignReports, setCampaignReports] = useState<ACCampaign[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadEmailData();
        }
    }, [isOpen]);

    const loadEmailData = async () => {
        const lists = await getLists();
        setAcLists(lists);
        const reports = await getReports();
        setCampaignReports(reports);
    };

    const handleGenerateEmail = async () => {
        if (!video) return;
        setEmailStep('generating');
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
            const result = await generateEmailOpenAI(video.title, video.description || '', videoUrl);
            setEmailData(result);
            setEmailStep('editing');
        } catch (error) {
            console.error("Error generating email:", error);
            setEmailStep('initial');
            alert("Erro ao gerar email. Verifique o console.");
        }
    };

    const handleSendCampaign = async () => {
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

    if (!isOpen || !video) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Mail className="text-blue-600" size={24} />
                            Email Marketing
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Divulgue "{video.title}" para sua lista
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
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    {emailStep === 'initial' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <TrendingUp size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Gerar Campanha com IA</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto text-lg">
                                Nossa IA irá analisar o conteúdo do seu vídeo e criar um e-mail persuasivo otimizado para cliques.
                            </p>
                            <button
                                onClick={handleGenerateEmail}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center gap-3 mx-auto shadow-lg shadow-blue-500/30"
                            >
                                <TrendingUp size={24} />
                                Gerar Email Agora
                            </button>
                        </div>
                    )}

                    {emailStep === 'generating' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Criando seu email...</h3>
                            <p className="text-slate-500 dark:text-slate-400">A IA está escrevendo o copy perfeito para você.</p>
                        </div>
                    )}

                    {emailStep === 'editing' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText size={20} className="text-blue-500" />
                                    Revisar Conteúdo
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assunto do Email</label>
                                    <input
                                        type="text"
                                        value={emailData.subject}
                                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Corpo do Email (HTML)</label>
                                    <textarea
                                        value={emailData.body}
                                        onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                                        rows={12}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono text-sm leading-relaxed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lista de Destinatários</label>
                                    <select
                                        value={selectedList}
                                        onChange={(e) => setSelectedList(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                    >
                                        <option value="all">Todas as Listas</option>
                                        {acLists.map(list => (
                                            <option key={list.id} value={list.id}>{list.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => setEmailStep('initial')}
                                    className="px-6 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleSendCampaign}
                                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-green-500/20"
                                >
                                    <Send size={18} />
                                    Enviar Campanha
                                </button>
                            </div>
                        </div>
                    )}

                    {emailStep === 'sending' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Enviando campanha...</h3>
                            <p className="text-slate-500 dark:text-slate-400">Conectando ao ActiveCampaign.</p>
                        </div>
                    )}

                    {emailStep === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Sucesso!</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto text-lg">
                                Sua campanha foi criada e agendada com sucesso no ActiveCampaign.
                            </p>
                            <button
                                onClick={onClose}
                                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Reports (Always visible if exists) */}
                {campaignReports.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-100 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <BarChart2 size={14} />
                            Últimas Campanhas
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-400 uppercase">
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
                                            <td className="px-2 py-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap truncate max-w-[150px]">
                                                {campaign.name}
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${campaign.status === '1' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {campaign.status === '1' ? 'Agendado' : 'Enviado'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-xs">{new Date(campaign.sdate).toLocaleDateString()}</td>
                                            <td className="px-2 py-2 text-xs">{campaign.uniqueopens || '-'}</td>
                                            <td className="px-2 py-2 text-xs">{campaign.linkclicks || '-'}</td>
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
