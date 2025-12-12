import React, { useState } from 'react';
import FileUploader from './DescriptionGenerator/FileUploader';
import ConfigurationForm, { DescriptionConfigData } from './DescriptionGenerator/ConfigurationForm';
import DescriptionResult from './DescriptionGenerator/TranscriptionResult';
import HistoryModal from './DescriptionGenerator/HistoryModal';
import { transcribeAudioOpenAI, generateDescriptionOpenAI, GeneratedContent } from '../services/openaiService';
import { supabase } from '../services/supabaseClient';
import { saveProject, ProjectRow } from '../services/descriptionStorage';
import { downloadTextFile } from '../utils/fileHelpers';
import { Loader2, ArrowRight, Info, Sparkles, AlertTriangle, CheckCircle2, FileText, ChevronDown, ChevronUp, Download, FolderOpen } from 'lucide-react';

export const DescriptionGenerator: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Audio Upload, 2: Config, 3: Result
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);

  // Transcription State
  const [transcription, setTranscription] = useState<string | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);

  // File Data
  const [fileData, setFileData] = useState<{
    base64: string;
    mimeType: string;
    fileName?: string;
    file?: File;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [config, setConfig] = useState<DescriptionConfigData>({
    videoTitle: '',
    ctaText: '',
    ctaUrl: '',
    ctaPosition: 'top',
    links: [],
    socials: [
      { id: 'insta', network: 'Instagram', url: '', enabled: false },
      { id: 'twitter', network: 'X', url: '', enabled: false },
      { id: 'youtube', network: 'YouTube', url: '', enabled: false },
      { id: 'tiktok', network: 'TikTok', url: '', enabled: false },
    ]
  });

  const handleFileSelected = (base64: string, mimeType: string, fileName: string, file: File) => {
    setFileData({ base64, mimeType, fileName, file });
    setError(null);
    setTranscription(null); // Reset transcription
  };

  const getSocialUrl = (network: string, input: string) => {
    let handle = input.trim();
    handle = handle.replace(/^https?:\/\/(www\.)?(instagram\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com)\//, '');
    handle = handle.replace(/^@/, '');
    if (!handle) return '';

    switch (network) {
      case 'Instagram': return `https://instagram.com/${handle}`;
      case 'X': return `https://twitter.com/${handle}`;
      case 'YouTube': return `https://youtube.com/@${handle}`;
      case 'TikTok': return `https://tiktok.com/@${handle}`;
      default: return input;
    }
  };

  const assembleFinalDescription = (content: GeneratedContent) => {
    let final = "";

    // 1. Intro
    final += content.intro + "\n\n";

    // Helper for CTA Block
    const ctaBlock = (config.ctaText || config.ctaUrl)
      ? `${config.ctaText ? `📌 ${config.ctaText}\n` : ''}🔸 ${config.ctaUrl}\n\n`
      : '';

    if (config.ctaPosition === 'top') final += ctaBlock;

    // 2. Top Links
    const topLinks = config.links.filter(l => l.position === 'top');
    if (topLinks.length > 0) {
      topLinks.forEach(l => {
        final += `${l.title}: ${l.url}\n`;
      });
      final += "\n";
    }

    if (config.ctaPosition === 'middle') final += ctaBlock;

    // 3. Chapters
    const chaptersText = Array.isArray(content.chapters) ? content.chapters.join('\n') : content.chapters;
    final += "🎬 TÓPICOS DO VÍDEO\n" + chaptersText + "\n\n";

    if (config.ctaPosition === 'bottom') final += ctaBlock;

    // 5. Socials
    const enabledSocials = config.socials.filter(s => s.enabled && s.url.trim() !== '');
    if (enabledSocials.length > 0) {
      final += "📲 ME SIGA NAS REDES SOCIAIS\n";
      enabledSocials.forEach(s => {
        const fullUrl = getSocialUrl(s.network, s.url);
        final += `${fullUrl}\n`;
      });
      final += "\n";
    }

    // 6. Important Links
    const bottomLinks = config.links.filter(l => l.position === 'bottom');
    if (bottomLinks.length > 0) {
      final += "📌 LINKS IMPORTANTES\n";
      bottomLinks.forEach(l => {
        final += `🔸 ${l.title}: ${l.url}\n`;
      });
      final += "\n";
    }

    // 7. Hashtags
    final += content.hashtags;

    return final;
  };

  // Step 1: Transcrever Áudio com Whisper (OpenAI)
  const uploadToSupabase = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('temp-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: urlError } = await supabase.storage
        .from('temp-uploads')
        .createSignedUrl(filePath, 60 * 10); // 10 minutes

      if (urlError) throw urlError;

      return data.signedUrl;
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      throw new Error('Falha ao fazer upload do arquivo.');
    }
  };

  // Step 1: Transcrever Áudio com Whisper (OpenAI)
  const handleUploadAndProcess = async () => {
    if (!fileData?.file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(10);
    setStatusMessage("Enviando para Storage...");

    try {
      // 1. Upload to Supabase Storage
      const fileUrl = await uploadToSupabase(fileData.file);
      console.log("File uploaded, signed URL:", fileUrl);

      setStatusMessage("Enviando para OpenAI Whisper...");
      setProgress(30);

      // Simula progresso visual enquanto aguarda a promise
      const fakeProgress = setInterval(() => {
        setProgress(old => (old < 80 ? old + 5 : old));
      }, 500);

      // Chamada real para OpenAI Whisper (agora enviando URL)
      const text = await transcribeAudioOpenAI(fileUrl);

      clearInterval(fakeProgress);
      setProgress(100);
      setStatusMessage("Transcrição concluída!");
      setTranscription(text);

      setTimeout(() => {
        setIsProcessing(false);
        setStep(2);
        setProgress(0);
        setShowTranscription(true); // Abre o painel no próximo passo
      }, 800);

    } catch (err: any) {
      setIsProcessing(false);
      console.error(err);
      setError(err.message || "Erro ao transcrever áudio. Verifique sua API Key.");
    }
  };

  // Step 2: Gerar Descrição com GPT-4o (Usando a transcrição)
  const handleFinalGeneration = async () => {
    if (!transcription) {
      setError("Erro: Transcrição não encontrada. Volte ao passo 1.");
      return;
    }
    if (!config.videoTitle.trim()) {
      setError("Por favor, informe o título do vídeo para otimização SEO.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(5);
    setStatusMessage("Enviando contexto para GPT-4o...");

    const progressInterval = setInterval(() => {
      setProgress(old => {
        if (old >= 90) return 90;
        return old + 2;
      });

      setStatusMessage(prev => {
        if (progress > 50) return "Escrevendo copy...";
        return prev;
      });
    }, 200);

    try {
      const content = await generateDescriptionOpenAI(
        transcription,
        config.videoTitle
      );

      clearInterval(progressInterval);
      setProgress(100);
      setStatusMessage("Concluído!");

      const fullDescription = assembleFinalDescription(content);
      setGeneratedDescription(fullDescription);
      setGeneratedContent(content);

      setTimeout(() => {
        setStep(3);
        setIsProcessing(false);
      }, 600);

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      console.error(err);
      setError(err.message || "Erro ao gerar descrição com GPT-4.");
    }
  };

  const handleSaveProject = async () => {
    if (generatedDescription) {
      await saveProject(config.videoTitle, generatedDescription);
    }
  };

  const handleLoadProject = (project: ProjectRow) => {
    setConfig(prev => ({ ...prev, videoTitle: project.video_title || project.name }));
    setGeneratedDescription(project.final_description);
    setStep(3);
    setIsHistoryOpen(false);
  };

  const resetAll = () => {
    setStep(1);
    setGeneratedDescription(null);
    setGeneratedContent(null);
    setFileData(null);
    setTranscription(null);
    setError(null);
    setConfig({
      ...config,
      videoTitle: '',
      ctaText: '',
      ctaUrl: '',
      ctaPosition: 'top',
      links: []
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans animate-fade-in transition-colors duration-200">

      {/* Custom Header for Tool */}
      <div className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Gerador de Descrição</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">IA Powered</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Meus Projetos</span>
            </button>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="hidden sm:inline font-medium">v2.6.3</span>
            </div>
          </div>
        </div>
      </div>

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadProject={handleLoadProject}
      />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {step === 1 && (
            <div className="text-center space-y-4 mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                Crie Descrições <span className="text-green-600 dark:text-green-500">Virais com GPT-4o</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Envie seu áudio para o Whisper da OpenAI e deixe o GPT criar sua copy.
              </p>
            </div>
          )}

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center ${step >= 1 ? 'text-green-600 dark:text-green-500' : 'text-slate-300 dark:text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-500' : 'border-slate-300 dark:border-slate-600'} font-bold`}>1</div>
              <span className="ml-2 font-medium hidden sm:block">Arquivo (Whisper)</span>
            </div>
            <div className={`w-12 h-0.5 mx-4 ${step >= 2 ? 'bg-green-600 dark:bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-green-600 dark:text-green-500' : 'text-slate-300 dark:text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-500' : 'border-slate-300 dark:border-slate-600'} font-bold`}>2</div>
              <span className="ml-2 font-medium hidden sm:block">Configuração</span>
            </div>
            <div className={`w-12 h-0.5 mx-4 ${step >= 3 ? 'bg-green-600 dark:bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
            <div className={`flex items-center ${step >= 3 ? 'text-green-600 dark:text-green-500' : 'text-slate-300 dark:text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-500' : 'border-slate-300 dark:border-slate-600'} font-bold`}>3</div>
              <span className="ml-2 font-medium hidden sm:block">Resultado</span>
            </div>
          </div>

          {/* Step 1: Audio Input */}
          {step === 1 && (
            <div className="space-y-6">
              <FileUploader
                onFileSelected={handleFileSelected}
                isTranscribing={isProcessing}
                isLoading={isProcessing}
              />

              {fileData && (
                <div className="flex flex-col items-center pt-6 gap-4 animate-fade-in">
                  {isProcessing && (
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 p-6 rounded-xl border border-green-100 dark:border-green-900 shadow-lg mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">{statusMessage}</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-500">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-green-600 dark:bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {!isProcessing && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
                        <Info size={14} className="text-green-500" />
                        Arquivo: <span className="font-semibold text-slate-700 dark:text-slate-200">{fileData.fileName}</span>
                      </div>
                      <button
                        onClick={() => {
                          console.log("Transcrever Áudio (Whisper)", fileData.file);
                          handleUploadAndProcess();
                        }}
                        className="group relative inline-flex items-center justify-center px-8 py-3.5 text-lg font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 rounded-full shadow-lg transition-all hover:scale-[1.02]"
                      >
                        Transcrever Áudio (Whisper)
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {error && !isProcessing && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg flex items-start gap-3 max-w-2xl mx-auto">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm font-medium">{error}</div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && (
            <div className="space-y-6">

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm transition-colors">
                <div
                  className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setShowTranscription(!showTranscription)}
                >
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <FileText size={18} className="text-green-600 dark:text-green-500" />
                    <h4 className="font-semibold">Transcrição Completa <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">(Gerada pelo Whisper)</span></h4>
                  </div>
                  {showTranscription ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>

                {showTranscription && transcription && (
                  <div className="p-6 animate-in slide-in-from-top-2">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 max-h-60 overflow-y-auto text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {transcription}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => downloadTextFile(transcription, `transcricao-${fileData?.fileName || 'audio'}.txt`)}
                          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-500"
                        >
                          <Download size={14} />
                          Baixar .txt
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-full text-green-700 dark:text-green-400">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">Transcrição Sucesso!</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">O GPT-4o usará o texto acima para criar sua descrição.</p>
                </div>
              </div>

              <ConfigurationForm
                config={config}
                onChange={setConfig}
              />

              <div className="flex flex-col items-center justify-center pt-4 gap-4">
                {!isProcessing ? (
                  <div className="flex items-center justify-between w-full">
                    <button
                      onClick={() => {
                        setStep(1);
                        setFileData(null);
                        setTranscription(null);
                      }}
                      className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2"
                    >
                      Voltar
                    </button>

                    <button
                      onClick={handleFinalGeneration}
                      className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                      <Sparkles className="w-5 h-5 mr-2 text-green-100" />
                      Gerar com GPT-4o
                    </button>
                  </div>
                ) : (
                  <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl border border-green-200 dark:border-green-900 shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="w-5 h-5 animate-spin text-green-600 dark:text-green-500" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{statusMessage}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-teal-600 h-3 rounded-full relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_1s_infinite] skew-x-12"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm font-medium">{error}</div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && generatedDescription && (
            <div className="space-y-6">
              <DescriptionResult
                data={generatedContent}
                text={generatedDescription}
                onTextChange={setGeneratedDescription}
                onBack={resetAll}
                onSaveProject={handleSaveProject}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
};