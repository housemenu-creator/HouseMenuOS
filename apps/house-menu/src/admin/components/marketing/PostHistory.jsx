import { motion, AnimatePresence } from 'framer-motion';
import { History, Instagram, Facebook, CheckCircle2, XCircle, Loader2, Eye, ThumbsUp, MessageCircle, Share2, Trash2 } from 'lucide-react';

function PostIcon({ platform }) {
  if (platform === 'instagram' || platform === 'both') return <Instagram className="w-3.5 h-3.5" />;
  if (platform === 'facebook') return <Facebook className="w-3.5 h-3.5" />;
  return null;
}

function Metric({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-1 text-[0.55rem] text-cm-text-tertiary">
      <Icon className="w-3 h-3" />
      <span>{value ?? '-'}</span>
    </div>
  );
}

export default function PostHistory({ posts = [], onDelete, onRetry, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-cm-surface rounded-xl border border-cm-border">
        <History className="w-10 h-10 text-cm-text-tertiary mb-3" />
        <p className="text-sm font-bold text-cm-text mb-1">Sin publicaciones</p>
        <p className="text-xs text-cm-text-tertiary">Las publicaciones aparecerán acá una vez creadas.</p>
      </div>
    );
  }

  const sorted = [...posts].sort((a, b) => new Date(b.publishedAt || b.scheduledAt || 0) - new Date(a.publishedAt || a.scheduledAt || 0));

  return (
    <div className="space-y-2">
      {sorted.map((post, i) => (
        <motion.div
          key={post.id || i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-cm-surface border border-cm-border rounded-xl px-4 py-3 hover:border-cm-accent/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* Status indicator */}
            <div className={`mt-1 ${post.status === 'published' ? 'text-cm-success' : post.status === 'failed' ? 'text-cm-error' : 'text-cm-accent'}`}>
              {post.status === 'published' ? <CheckCircle2 className="w-4 h-4" /> :
               post.status === 'failed' ? <XCircle className="w-4 h-4" /> :
               <PostIcon platform={post.platform} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <PostIcon platform={post.platform} />
                <span className="text-[0.5rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cm-bg text-cm-text-tertiary">
                  {post.platform === 'both' ? 'Instagram + Facebook' : post.platform}
                </span>
                <span className={`text-[0.5rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  post.status === 'published' ? 'bg-cm-success/10 text-cm-success' :
                  post.status === 'failed' ? 'bg-cm-error/10 text-cm-error' :
                  'bg-cm-accent/10 text-cm-accent'
                }`}>
                  {post.status === 'published' ? 'Publicado' : post.status === 'failed' ? 'Fallido' : post.status === 'scheduled' ? 'Programado' : 'Borrador'}
                </span>
              </div>

              <p className="text-xs font-semibold text-cm-text line-clamp-2 mb-1">{post.caption || 'Sin texto'}</p>

              {(post.publishedAt || post.scheduledAt) && (
                <p className="text-[0.55rem] text-cm-text-tertiary mb-2">
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleString('es-PE') : new Date(post.scheduledAt).toLocaleString('es-PE')}
                </p>
              )}

              {/* Media preview */}
              {post.mediaUrl && (
                <div className="mb-2">
                  <img src={post.mediaUrl} alt="Post media"
                    className="w-full max-h-32 object-cover rounded-lg"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}

              {/* Metrics */}
              {post.status === 'published' && post.insights && (
                <div className="flex items-center gap-3 mt-1">
                  <Metric icon={Eye} value={post.insights.impressions} />
                  <Metric icon={ThumbsUp} value={post.insights.likes} />
                  <Metric icon={MessageCircle} value={post.insights.comments} />
                  <Metric icon={Share2} value={post.insights.shares} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
              {post.status === 'failed' && (
                <button onClick={() => onRetry?.(post.id)}
                  className="p-1.5 rounded-lg hover:bg-cm-bg text-cm-text-tertiary hover:text-cm-accent transition-colors"
                  title="Reintentar">
                  <Loader2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => onDelete?.(post.id)}
                className="p-1.5 rounded-lg hover:bg-cm-bg text-cm-text-tertiary hover:text-cm-error transition-colors"
                title="Eliminar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
