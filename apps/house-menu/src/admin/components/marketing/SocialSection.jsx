import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Instagram, Facebook, MessageCircle, QrCode, CalendarDays, BarChart3, History,
  Share2, Send, Plus, X, Loader2, Check, Link2, AlertCircle, ChevronDown,
  Smartphone, Globe,
} from 'lucide-react';
import { socialService } from '../../../lib/socialService';
import SocialConnections from './SocialConnections';
import InstagramFeed from './InstagramFeed';
import PublishModal from './PublishModal';
import ContentCalendar from './ContentCalendar';
import SchedulePostModal from './SchedulePostModal';
import PostHistory from './PostHistory';
import SocialAnalytics from './SocialAnalytics';
import WhatsAppSender from './WhatsAppSender';
import QrCodeGenerator from './QrCodeGenerator';

// Sub-sections inside Social
const SOCIAL_TABS = [
  { key: 'overview', label: 'Dashboard', icon: BarChart3 },
  { key: 'connections', label: 'Conexiones', icon: Link2 },
  { key: 'publish', label: 'Publicar', icon: Share2 },
  { key: 'analytics', label: 'Analíticas', icon: BarChart3 },
  { key: 'calendar', label: 'Calendario', icon: CalendarDays },
  { key: 'history', label: 'Historial', icon: History },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'qrcodes', label: 'Códigos QR', icon: QrCode },
];

export default function SocialSection({ activeBranchId, campaigns = [], categories = [] }) {
  const [activeTab, setActiveTab] = useState('overview');

  // State
  const [connections, setConnections] = useState(null);
  const [postFeed, setPostFeed] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [postHistory, setPostHistory] = useState([]);
  const [insights, setInsights] = useState(null);
  const [whatsappMessages, setWhatsAppMessages] = useState([]);
  const [qrCode, setQrCode] = useState(null);

  // Loading
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // ── Subscriptions ──

  useEffect(() => {
    if (!activeBranchId) return;

    const unsubConnections = socialService.subscribeConnections(activeBranchId, setConnections);

    const unsubFeed = socialService.subscribePosts(activeBranchId, (cb) => {
      if (typeof cb === 'function') {
        setPostFeed(cb);
      } else {
        setPostFeed(cb || []);
      }
    });

    const unsubScheduled = socialService.subscribeScheduledPosts(activeBranchId, setScheduledPosts);

    const unsubWhatsApp = socialService.subscribeWhatsAppHistory(activeBranchId, (cb) => {
      if (typeof cb === 'function') {
        setWhatsAppMessages(cb);
      } else {
        setWhatsAppMessages(cb || []);
      }
    });

    // Load analytics
    const loadInsights = async () => {
      const [igInsights, fbInsights] = await Promise.all([
        socialService.getInsights(activeBranchId, 'instagram'),
        socialService.getInsights(activeBranchId, 'facebook'),
      ]);
      setInsights({
        instagram: igInsights,
        facebook: fbInsights,
        totalImpressions: (igInsights?.reachWeekly || 0) + (fbInsights?.reachWeekly || 0),
        totalReach: (igInsights?.reachWeekly || 0) + (fbInsights?.reachWeekly || 0),
        totalEngagement: 0,
        totalShares: 0,
        trends: { impressions: 12.5, reach: 8.3, engagement: 4.2, shares: 6.1 },
      });
    };
    loadInsights();

    // Load post history
    socialService.getPostHistory(activeBranchId).then(setPostHistory).catch(() => {});

    setLoading(false);

    return () => {
      unsubConnections();
      unsubFeed();
      unsubScheduled();
      unsubWhatsApp();
    };
  }, [activeBranchId]);

  // ── Handlers ──

  const handlePublish = async (data) => {
    setPublishing(true);
    try {
      let result;
      if (data.platform === 'instagram') {
        result = await socialService.publishToInstagram(activeBranchId, {
          imageUrl: data.imageUrl || data.mediaUrl || '',
          caption: data.caption,
        });
      } else if (data.platform === 'facebook') {
        result = await socialService.publishToFacebook(activeBranchId, {
          message: data.caption,
          imageUrl: data.imageUrl || data.mediaUrl || '',
        });
      } else {
        result = await socialService.publishToBoth(activeBranchId, {
          imageUrl: data.imageUrl || data.mediaUrl || '',
          caption: data.caption,
        });
      }
      setPostFeed((prev) => [{ ...result, publishedAt: Date.now() }, ...prev]);
      setShowPublishModal(false);
    } catch (err) {
      console.error('Publish error:', err);
    }
    setPublishing(false);
  };

  const handleSchedule = async (data) => {
    try {
      await socialService.schedulePost(activeBranchId, data);
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Schedule error:', err);
    }
  };

  const handleQrGenerate = async (campaignId, campaignName, color) => {
    setQrGenerating(true);
    try {
      const qr = await socialService.generateQrCode(activeBranchId, campaignId, campaignName);
      setQrCode({ ...qr, color, scanCount: 0 });
    } catch (err) {
      console.error('QR error:', err);
    }
    setQrGenerating(false);
  };

  const handleWhatsAppSend = async (data) => {
    try {
      const result = await socialService.sendWhatsApp(activeBranchId, {
        to: data.phoneNumber || '',
        templateName: 'custom',
        parameters: { message: data.message },
      });
      setWhatsAppMessages((prev) => [{ ...result, message: data.message, targetGroup: data.targetGroup }, ...prev]);
    } catch (err) {
      console.error('WhatsApp error:', err);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await socialService.deleteScheduledPost(activeBranchId, postId);
      setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // ── Tab Renderers ──

  const renderOverview = () => {
    const connectedPlatforms = connections
      ? Object.entries(connections).filter(([, v]) => v.connected).length
      : 0;
    return (
      <div className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <Instagram className="w-4 h-4 text-pink-400 mb-1" />
            <p className="text-lg font-black text-cm-text">{connectedPlatforms}/3</p>
            <p className="text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary">Plataformas conectadas</p>
          </div>
          <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <Share2 className="w-4 h-4 text-cm-accent mb-1" />
            <p className="text-lg font-black text-cm-text">{postFeed.length}</p>
            <p className="text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary">Publicaciones</p>
          </div>
          <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <CalendarDays className="w-4 h-4 text-blue-400 mb-1" />
            <p className="text-lg font-black text-cm-text">{scheduledPosts.length}</p>
            <p className="text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary">Programadas</p>
          </div>
          <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <BarChart3 className="w-4 h-4 text-green-400 mb-1" />
            <p className="text-lg font-black text-cm-text">{insights?.totalImpressions?.toLocaleString() || '-'}</p>
            <p className="text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary">Impresiones</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button onClick={() => setShowPublishModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all">
            <Share2 className="w-4 h-4" /> Publicar ahora
          </button>
          <button onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cm-accent text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all">
            <CalendarDays className="w-4 h-4" /> Programar
          </button>
        </div>

        {/* Feed preview */}
        <div>
          <p className="text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-2">
            Últimas publicaciones
          </p>
          <InstagramFeed
            posts={postFeed.slice(0, 6)}
            loading={loading}
            onRefresh={() => socialService.getPostHistory(activeBranchId).then(setPostHistory)}
          />
        </div>
      </div>
    );
  };

  const renderConnections = () => (
    <SocialConnections
      connections={connections}
      loading={loading}
      onConnect={(platform) => {
        const url = socialService.getOAuthUrl(platform, `${window.location.origin}/admin/marketing`);
        if (url) window.open(url, 'oauth_popup', 'width=600,height=700');
      }}
      onDisconnect={async (platform) => {
        await socialService.disconnectPlatform(activeBranchId, platform);
        setConnections((prev) => ({ ...prev, [platform]: { ...prev[platform], connected: false } }));
      }}
    />
  );

  const renderPublish = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-cm-text">Publicar en redes</p>
          <p className="text-xs text-cm-text-secondary">Creá y publicá contenido en Instagram y Facebook</p>
        </div>
        <button onClick={() => setShowPublishModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Nueva publicación
        </button>
      </div>

      <InstagramFeed
        posts={postFeed}
        loading={loading}
        onRefresh={() => socialService.getPostHistory(activeBranchId).then(setPostHistory)}
      />
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-cm-text">Analíticas de Redes</p>
        <p className="text-xs text-cm-text-secondary">Rendimiento de Instagram y Facebook</p>
      </div>
      <SocialAnalytics insights={insights} loading={loading} />
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-cm-text">Calendario de Contenido</p>
          <p className="text-xs text-cm-text-secondary">Visualizá y gestioná tus publicaciones programadas</p>
        </div>
        <button onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cm-accent text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Programar
        </button>
      </div>
      <ContentCalendar
        posts={scheduledPosts}
        loading={loading}
        onPostClick={(post) => {}}
        onDateClick={(date) => {}}
      />
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-cm-text">Historial de Publicaciones</p>
        <p className="text-xs text-cm-text-secondary">Todas las publicaciones realizadas</p>
      </div>
      <PostHistory
        posts={[...postHistory, ...postFeed]}
        loading={loading}
        onDelete={handleDeletePost}
        onRetry={(id) => {}}
      />
    </div>
  );

  const renderWhatsApp = () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-cm-text">WhatsApp Marketing</p>
        <p className="text-xs text-cm-text-secondary">Enviá mensajes promocionales a tus clientes</p>
      </div>
      <WhatsAppSender
        onSend={handleWhatsAppSend}
        sending={false}
        messages={whatsappMessages}
        onDeleteMessage={(id) => setWhatsAppMessages((prev) => prev.filter((m) => m.id !== id))}
      />
    </div>
  );

  const renderQrCodes = () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-cm-text">Códigos QR para Campañas</p>
        <p className="text-xs text-cm-text-secondary">Generá QR codes para tus promociones</p>
      </div>
      <QrCodeGenerator
        campaigns={campaigns}
        onGenerate={handleQrGenerate}
        qrData={qrCode}
        generating={qrGenerating}
      />
    </div>
  );

  // ── Tab content ──

  const tabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'connections': return renderConnections();
      case 'publish': return renderPublish();
      case 'analytics': return renderAnalytics();
      case 'calendar': return renderCalendar();
      case 'history': return renderHistory();
      case 'whatsapp': return renderWhatsApp();
      case 'qrcodes': return renderQrCodes();
      default: return renderOverview();
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <nav className="flex gap-1 overflow-x-auto pb-1">
        {SOCIAL_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'text-cm-text-secondary hover:bg-cm-accent/10'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </nav>

      {/* Social demo badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-[0.55rem] font-semibold text-amber-300">
          Modo DEMO — los datos mostrados son simulados. Conectá tus cuentas de Instagram/Facebook/WhatsApp
          en la sección Conexiones para habilitar el modo real.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
        </div>
      ) : (
        tabContent()
      )}

      {/* Modals */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={handlePublish}
        categories={categories}
        publishing={publishing}
      />
      <SchedulePostModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSave={handleSchedule}
        categories={categories}
        saving={false}
      />
    </div>
  );
}
