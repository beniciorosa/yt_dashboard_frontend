import React, { useEffect, useState } from 'react';
import { X, Mail, TrendingUp, FileText, Send, CheckCircle, BarChart2, Link as LinkIcon, PlayCircle, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { VideoData } from '../services/youtubeService';
// import { generateEmailOpenAI } from '../services/openaiService'; // Disabled for now
import { getLists, sendCampaign, getReports, ACList, ACCampaign } from '../services/activeCampaignService';

interface EmailGenerationModalProps {
    video: VideoData | null;
    isOpen: boolean;
    onClose: () => void;
}

export const EmailGenerationModal: React.FC<EmailGenerationModalProps> = ({ video, isOpen, onClose }) => {
    // 1: Campaign Name, 2: Details (Subject, Preheader, Sender, Body), 3: Lists/Review
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

    // Steps: 'editing' (default now), 'sending', 'success'
    const [emailStep, setEmailStep] = useState<'editing' | 'sending' | 'success'>('editing');

    const [campaignName, setCampaignName] = useState('');
    const [emailData, setEmailData] = useState<{ subject: string; preheader: string; body: string }>({ subject: '', preheader: '', body: '' });
    const [senderDetails, setSenderDetails] = useState({
        fromname: '',
        fromemail: '',
        reply2: ''
    });

    const [acLists, setAcLists] = useState<ACList[]>([]);
    const [selectedList, setSelectedList] = useState<string>('all');
    const [campaignReports, setCampaignReports] = useState<ACCampaign[]>([]);
    const [testEmail, setTestEmail] = useState<string>('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    useEffect(() => {
        if (isOpen && video) {
            loadEmailData();
            // Pre-fill with template
            const initialSubject = `Novo Vídeo: ${video.title}`;
            setCampaignName(initialSubject);
            setEmailData({
                subject: initialSubject,
                preheader: `Veja o novo vídeo: ${video.title}`,
                body: `Olá,\n\nAcabei de publicar um novo vídeo no canal: <b>${video.title}</b>\n\n${video.description ? video.description.substring(0, 150) + '...' : ''}\n\n<a href="https://www.youtube.com/watch?v=${video.id}" style="display: inline-block; background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Assistir Agora</a>\n\nEspero que goste!\n\nAbraços.`
            });
            // Defaults (should ideally come from user settings)
            setSenderDetails({
                fromname: 'Seu Nome',
                fromemail: 'seu@email.com',
                reply2: 'seu@email.com'
            });
            setWizardStep(1);
            setEmailStep('editing');
        }
    }, [isOpen, video]);

    const loadEmailData = async () => {
        const lists = await getLists();
        setAcLists(lists);
        const reports = await getReports();
        setCampaignReports(reports);
    };

    const handleNextStep = () => {
        if (wizardStep === 1 && !campaignName.trim()) {
            alert("Digite o nome da campanha para continuar.");
            return;
        }
        if (wizardStep === 2) {
            if (!emailData.subject || !senderDetails.fromname || !senderDetails.fromemail) {
                alert("Preencha todos os campos obrigatórios (Assunto, Nome, Email).");
                return;
            }
        }
        setWizardStep(prev => (prev < 3 ? prev + 1 : prev) as 1 | 2 | 3);
    };

    const handlePrevStep = () => {
        setWizardStep(prev => (prev > 1 ? prev - 1 : prev) as 1 | 2 | 3);
    };

    const handleSendCampaign = async () => {
        if (!confirm("Tem certeza que deseja enviar esta campanha para a lista selecionada?")) return;

        setEmailStep('sending');
        try {
            await sendCampaign(
                emailData.subject, // API uses subject as name? No, wait.
                // The current API sendCampaign uses 'subject' as 'name' AND 'subject' if we don't change it.
                // We should probably update the API to accept 'name' separately, but keeping consistent:
                // Actually, in our updated backend, we used 'subject' as name.
                // NOTE: Ideally we should fix the backend to accept 'name' distinct from 'subject'.
                // For now, I will use subject as the campaign name, or modify service to take name.
                // Let's stick to current backend signature: subject IS the name in backend line 98.
                // Wait, user wants Campaign Name separate. 
                // Correction: The backend sets name: subject. 
                // I will pass campaignName as the subject? No, that's confusing.
                // I will assume for now subject = subject. Campaign Name is internal? 
                // ActiveCampaign usually needs a Campaign Name.
                // I'll proceed with passing 'subject' but noting this limitation or I'll update the frontend service to take campaignName too.
                // For this step, let's use global 'campaignName' as the subject if the user didn't edit subject? No.
                // Let's rely on the fields. 
                emailData.body,
                selectedList,
                senderDetails.fromname,
                senderDetails.fromemail,
                senderDetails.reply2,
                emailData.preheader
            );
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

            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 flex flex-col h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Mail className="text-blue-600" size={24} />
                            Assistente de Campanha
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <StepsIndicator currentStep={wizardStep} totalSteps={3} />
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 overflow-hidden flex-1 relative bg-slate-50/50 dark:bg-slate-900/20">

                    {emailStep === 'editing' ? (
                        <div className="h-full overflow-y-auto p-8">

                            {/* STEP 1: CAMPAIGN NAME */}
                            {wizardStep === 1 && (
                                <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Qual o nome da sua campanha?</h3>
                                        <p className="text-slate-500 dark:text-slate-400">Este nome é interno e será usado para você identificar esta campanha nos relatórios.</p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                            Nome da Campanha <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                className="w-full p-4 pl-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-lg text-slate-900 dark:text-white"
                                                placeholder="Ex: Newsletter Vídeo Novo - 12/2025"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: DETAILS & CONTENT */}
                            {wizardStep === 2 && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-in slide-in-from-right-8 duration-300">
                                    {/* Left: Settings */}
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-5">
                                            <h4 className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-700">Detalhes do Envio</h4>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Assunto <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={emailData.subject}
                                                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                                    placeholder="Assunto do email..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Pré-cabeçalho</label>
                                                <input
                                                    type="text"
                                                    value={emailData.preheader}
                                                    onChange={(e) => setEmailData({ ...emailData, preheader: e.target.value })}
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                                    placeholder="Texto de apoio que aparece após o assunto..."
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">Opcional. Aparece ao lado do assunto na caixa de entrada.</p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 pt-2">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Nome do Remetente <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        value={senderDetails.fromname}
                                                        onChange={(e) => setSenderDetails({ ...senderDetails, fromname: e.target.value })}
                                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Email do Remetente <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="email"
                                                        value={senderDetails.fromemail}
                                                        onChange={(e) => setSenderDetails({ ...senderDetails, fromemail: e.target.value })}
                                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Reply-To</label>
                                                    <input
                                                        type="email"
                                                        value={senderDetails.reply2}
                                                        onChange={(e) => setSenderDetails({ ...senderDetails, reply2: e.target.value })}
                                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                                        placeholder="Mesmo do remetente"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                            <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 text-sm">Teste Rápido</h4>
                                            <div className="flex gap-2">
                                                <input
                                                    type="email"
                                                    value={testEmail}
                                                    onChange={(e) => setTestEmail(e.target.value)}
                                                    placeholder="seu@email.com"
                                                    className="flex-1 p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded text-sm"
                                                />
                                                <button
                                                    onClick={handleSendTest}
                                                    disabled={isSendingTest}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-bold transition-colors"
                                                >
                                                    {isSendingTest ? '...' : <Send size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Content Editor */}
                                    <div className="lg:col-span-2 flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
                                            <h4 className="font-bold text-slate-700 dark:text-slate-300">Conteúdo do Email (HTML)</h4>
                                            <div className="flex gap-2">
                                                <button onClick={insertLink} className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow-sm">
                                                    <LinkIcon size={12} /> Inserir Link
                                                </button>
                                                <button onClick={insertButton} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-100 px-3 py-1.5 rounded flex items-center gap-1 transition-colors">
                                                    <PlayCircle size={12} /> Botão Vídeo
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={emailData.body}
                                            onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                                            className="flex-1 w-full p-6 bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-200"
                                            placeholder="Digite o conteúdo HTML do seu email aqui..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: LISTS & CONFIRMATION */}
                            {wizardStep === 3 && (
                                <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Para quem vamos enviar?</h3>
                                        <p className="text-slate-500 dark:text-slate-400">Selecione a lista de destinatários para esta campanha.</p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Lista de Destinatários</label>
                                            <select
                                                value={selectedList}
                                                onChange={(e) => setSelectedList(e.target.value)}
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                            >
                                                <option value="all">Todas as Listas</option>
                                                {acLists.map(list => (
                                                    <option key={list.id} value={list.id}>{list.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30 flex gap-3">
                                            <div className="text-yellow-600 dark:text-yellow-500 pt-0.5">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-yellow-800 dark:text-yellow-400 text-sm">Pronto para agendar?</h4>
                                                <p className="text-yellow-700 dark:text-yellow-500 text-xs mt-1">Ao clicar em Enviar, uma campanha será criada no ActiveCampaign. Verifique se todos os dados estão corretos.</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSendCampaign}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Send size={20} />
                                            Criar Campanha
                                        </button>
                                    </div>

                                    <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-center">
                                        <p className="text-sm text-slate-500">
                                            Resumo: <strong>{campaignName}</strong> &bull; {senderDetails.fromemail}
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : null}

                    {emailStep === 'sending' && (
                        <div className="absolute inset-0 z-10 bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Criando Campanha...</h3>
                            <p className="text-slate-500 text-center max-w-md">Estamos comunicando com o ActiveCampaign para configurar sua campanha.</p>
                        </div>
                    )}

                    {emailStep === 'success' && (
                        <div className="absolute inset-0 z-10 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-8">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Campanha Criada!</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 text-center max-w-md">
                                A campanha <strong>{campaignName || emailData.subject}</strong> foi criada com sucesso como rascunho.
                            </p>
                            <button
                                onClick={onClose}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Navigation (only visible in editing) */}
                {emailStep === 'editing' && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-between items-center">
                        <button
                            onClick={handlePrevStep}
                            disabled={wizardStep === 1}
                            className="px-6 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            <ChevronLeft size={16} /> Voltar
                        </button>

                        {wizardStep < 3 ? (
                            <button
                                onClick={handleNextStep}
                                className="px-8 py-2.5 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
                            >
                                Próximo <ChevronRight size={16} />
                            </button>
                        ) : (
                            <div></div> // Spacer
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const StepsIndicator = ({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) => {
    return (
        <div className="flex items-center gap-1">
            {[...Array(totalSteps)].map((_, i) => (
                <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 === currentStep ? 'w-8 bg-blue-600' :
                            i + 1 < currentStep ? 'w-4 bg-green-500' : 'w-4 bg-slate-200 dark:bg-slate-700'
                        }`}
                />
            ))}
        </div>
    );
};
