import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { useUiStore } from '../../store/uiStore';
import { X, Server, Image, Save, Eye } from 'lucide-react';

export default function EditServerModal() {
  const { closeEditServerModal, editServerTargetId, addToast } = useUiStore();
  const { servers, editServer } = useChatStore();

  const server = servers.find(s => s.id === editServerTargetId);

  const [name, setName] = useState(server?.name || '');
  const [avatar, setAvatar] = useState(server?.avatar || '');
  const [banner, setBanner] = useState(server?.banner || '');
  const [description, setDescription] = useState(server?.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (server) {
      setName(server.name);
      setAvatar(server.avatar || '');
      setBanner(server.banner || '');
      setDescription(server.description || '');
    }
  }, [server?.id]);

  if (!server) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await editServer(server.id, { name: name.trim(), avatar, banner, description });
    setLoading(false);
    addToast(`Server "${name}" updated!`, 'success');
    closeEditServerModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full max-w-2xl glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left — Form */}
        <div className="flex-1 p-6 flex flex-col gap-4 min-w-0 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-white">Edit Server</h2>
            </div>
            <button onClick={closeEditServerModal} className="text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <Field label="Server Name">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field"
                placeholder="My Awesome Server"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="input-field resize-none"
                placeholder="What's this server about?"
              />
            </Field>

            <Field label="Avatar URL" hint="Square image, shown in server icon rail">
              <input
                type="text"
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
                className="input-field"
                placeholder="https://example.com/icon.png"
              />
            </Field>

            <Field label="Banner URL" hint="Wide image shown at the top of channels">
              <input
                type="text"
                value={banner}
                onChange={e => setBanner(e.target.value)}
                className="input-field"
                placeholder="https://example.com/banner.png"
              />
            </Field>
          </div>

          <button
            onClick={handleSave}
            disabled={!name.trim() || loading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2 btn-glow disabled:opacity-50 mt-auto"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Right — Live Preview */}
        <div className="w-full md:w-64 flex-shrink-0 p-5 bg-black/30 border-t md:border-t-0 md:border-l border-white/5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Eye className="w-3.5 h-3.5" /> Preview
          </div>

          {/* Banner preview */}
          <div className="rounded-xl overflow-hidden border border-white/10">
            <div className="h-16 relative">
              {banner ? (
                <img src={banner} alt="banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-600/40 to-blue-600/40 flex items-center justify-center">
                  <Image className="w-6 h-6 text-white/30" />
                </div>
              )}
            </div>
            <div className="p-3 bg-[hsl(222,47%,8%)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[hsl(222,47%,8%)] -mt-6 flex-shrink-0 bg-[hsl(222,47%,10%)]">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {name ? name.charAt(0).toUpperCase() : 'S'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 mt-1">
                <p className="text-sm font-bold text-white truncate">{name || 'Server Name'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{description || 'No description'}</p>
              </div>
            </div>
          </div>

          {/* Icon rail preview */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-2">Icon Rail Preview</p>
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/40">
              {avatar ? (
                <img src={avatar} alt="icon" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                  {name ? name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        .input-field {
          width: 100%;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.75rem;
          padding: 0.6rem 0.875rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus { border-color: hsl(263 80% 60% / 0.5); }
        .input-field::placeholder { color: hsl(215 20% 40%); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/60 mt-1">{hint}</p>}
    </div>
  );
}
