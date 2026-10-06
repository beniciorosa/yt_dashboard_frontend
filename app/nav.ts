import {
    Brain, DollarSign, FileText, GitBranch, LayoutDashboard, Link2, LucideIcon,
    Megaphone, MessageSquare, Plug, Shapes, Swords, Trophy, Users,
} from 'lucide-react';

export interface NavItem {
    path: string;
    label: string;
    /** Título longo exibido no cabeçalho da página. */
    title: string;
    icon: LucideIcon;
    adminOnly?: boolean;
    /** A tela usa o período global do cabeçalho. */
    usesPeriod?: boolean;
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

export const NAV: NavGroup[] = [
    {
        label: 'Canal',
        items: [
            { path: '/canal', label: 'Visão geral', title: 'Canal — visão geral', icon: LayoutDashboard },
            { path: '/canal/tipos', label: 'Tipos de vídeo', title: 'Tipos de vídeo', icon: Shapes },
        ],
    },
    {
        label: 'Receita',
        items: [
            { path: '/receita/vendas', label: 'Vendas', title: 'Vendas por vídeo', icon: DollarSign, usesPeriod: true },
            { path: '/receita/closers', label: 'Closers', title: 'Closers', icon: Trophy, usesPeriod: true },
            { path: '/receita/atribuicao', label: 'Atribuição', title: 'Atribuição de vendas', icon: GitBranch },
            { path: '/receita/promocoes', label: 'Promoções', title: 'Promoções e ROI', icon: Megaphone },
        ],
    },
    {
        label: 'Estúdio',
        items: [
            { path: '/estudio/descricoes', label: 'Descrições', title: 'Estúdio de descrições', icon: FileText },
            { path: '/estudio/links', label: 'Links e UTMs', title: 'Links e UTMs', icon: Link2 },
            { path: '/estudio/comentarios', label: 'Comentários', title: 'Comentários', icon: MessageSquare },
            { path: '/estudio/genius', label: 'Genius', title: 'Genius — ideias de conteúdo', icon: Brain },
        ],
    },
    {
        label: 'Mercado',
        items: [
            { path: '/mercado/concorrencia', label: 'Concorrência', title: 'Concorrência', icon: Swords },
        ],
    },
    {
        label: 'Admin',
        items: [
            { path: '/admin/usuarios', label: 'Usuários', title: 'Usuários', icon: Users, adminOnly: true },
            { path: '/admin/integracoes', label: 'Integrações', title: 'Integrações', icon: Plug, adminOnly: true },
        ],
    },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);
export const HOME_PATH = '/canal';
