import { motion } from 'framer-motion';
import { Instagram, Heart, MessageCircle, Users, Loader2, Sparkles, Camera } from 'lucide-react';

function SkeletonPost() {
  return (
    <div className="bg-cm-bg rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-cm-border" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 bg-cm-border rounded" />
        <div className="flex gap-3">
          <div className="h-3 w-12 bg-cm-border rounded" />
          <div className="h-3 w-12 bg-cm-border rounded" />
        </div>
      </div>
    </div>
  );
}

export default function InstagramFeed({ posts = [], followers = 0, connected = false, loading = false }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-cm-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonPost key={i} />)}
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-cm-surface rounded-xl border border-cm-border">
        <div className="w-16 h-16 rounded-2xl bg-cm-bg flex items-center justify-center mb-4">
          <Instagram className="w-8 h-8 text-cm-text-tertiary" />
        </div>
        <p className="text-sm font-bold text-cm-text mb-1">Conectá Instagram para ver tu feed</p>
        <p className="text-xs text-cm-text-tertiary text-center max-w-xs">
          Conectá tu cuenta de Instagram Business para ver y gestionar tus publicaciones desde acá.
        </p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-cm-surface rounded-xl border border-cm-border">
        <div className="w-16 h-16 rounded-2xl bg-cm-bg flex items-center justify-center mb-4">
          <Camera className="w-8 h-8 text-cm-text-tertiary" />
        </div>
        <p className="text-sm font-bold text-cm-text mb-1">Todavía no hay publicaciones</p>
        <p className="text-xs text-cm-text-tertiary">Las publicaciones aparecerán acá automáticamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile banner */}
      <div className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
          <Instagram className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-cm-text">@turestaurante</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-cm-text-secondary">
              <Users className="w-3 h-3" /> {followers.toLocaleString()} seguidores
            </span>
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {posts.map((post, i) => (
          <motion.div
            key={post.id || i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden hover:border-cm-accent/30 transition-colors group cursor-pointer"
          >
            <div className="aspect-square bg-gradient-to-br from-cm-accent/20 to-cm-bg flex items-center justify-center relative">
              <Camera className="w-8 h-8 text-cm-text-tertiary/30" />
              {post.caption && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <p className="text-white text-[0.55rem] font-semibold line-clamp-2">{post.caption}</p>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-[0.6rem] text-cm-text line-clamp-1 font-medium mb-2">{post.caption || 'Sin descripción'}</p>
              <div className="flex items-center gap-3 text-[0.55rem] text-cm-text-tertiary">
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes || 0}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comments || 0}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
