import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs,
  serverTimestamp,
  query,
  where,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Image as ImageIcon, MapPin, Tag, Send, X, ArrowLeft, Loader2, Trash2, Edit3, List, LayoutGrid } from 'lucide-react';
import { Post } from '../types';

interface AdminPanelProps {
  onClose: () => void;
  initialViewMode?: ViewMode;
  initialPost?: Post | null;
}

type ViewMode = 'create' | 'manage' | 'edit';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function AdminPanel({ onClose, initialViewMode = 'create', initialPost = null }: AdminPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(initialPost?.id || null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: initialPost?.title || '',
    excerpt: initialPost?.excerpt || '',
    content: initialPost?.content || '',
    category: (initialPost?.category || 'Sights') as Post['category'],
    region: (initialPost?.region || 'North') as Post['region'],
    image: initialPost?.image || '',
    author: initialPost?.author || auth.currentUser?.displayName || 'Admin',
    readTime: initialPost?.readTime || '5 min read'
  });

  const categories: Post['category'][] = ['Sights', 'Culture', 'Food', 'Adventure'];
  const regions: Post['region'][] = ['North', 'South', 'East', 'West', 'Central'];

  useEffect(() => {
    if (viewMode === 'manage') {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as Post[];
        setPosts(postsData);
      });
      return () => unsubscribe();
    }
  }, [viewMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting post...', { viewMode, editingPostId, formData });
    if (!auth.currentUser) {
      console.error('No authenticated user found');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (viewMode === 'edit' && editingPostId) {
        try {
          await updateDoc(doc(db, 'posts', editingPostId), {
            ...formData,
            updatedAt: serverTimestamp()
          });
          setSuccess('Post updated successfully!');
          setTimeout(() => setViewMode('manage'), 2000);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `posts/${editingPostId}`);
        }
      } else {
        try {
          await addDoc(collection(db, 'posts'), {
            ...formData,
            authorUid: auth.currentUser.uid,
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            likesCount: 0,
            createdAt: serverTimestamp()
          });
          setSuccess('Post published successfully!');
          setTimeout(onClose, 2000);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'posts');
        }
      }
    } catch (err: any) {
      console.error('Error saving post:', err);
      try {
        const parsedError = JSON.parse(err.message);
        setError(parsedError.error || 'Failed to save post.');
      } catch {
        setError(err.message || 'Failed to save post.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (post: Post) => {
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      region: post.region,
      image: post.image,
      author: post.author,
      readTime: post.readTime
    });
    setEditingPostId(post.id);
    setViewMode('edit');
  };

  const handleDelete = async (postId: string) => {
    setError(null);
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setDeleteConfirmId(null);
      setSuccess('Post deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting post:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
      } catch (innerErr: any) {
        try {
          const parsedError = JSON.parse(innerErr.message);
          setError(parsedError.error || 'Failed to delete post.');
        } catch {
          setError(innerErr.message || 'Failed to delete post.');
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'Sights',
      region: 'North',
      image: '',
      author: auth.currentUser?.displayName || 'Admin',
      readTime: '5 min read'
    });
    setEditingPostId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-stone-900/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
            <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors shrink-0">
              <ArrowLeft size={24} />
            </button>
            <div className="h-8 w-px bg-stone-200 shrink-0 hidden sm:block" />
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden xs:inline">Admin</span>
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline"> Authenticated</span>
            </div>
            <div className="h-8 w-px bg-stone-200 shrink-0" />
            <div className="flex bg-stone-200 p-1 rounded-xl shrink-0">
              <button 
                onClick={() => { setViewMode('create'); resetForm(); }}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'create' || viewMode === 'edit' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline">{viewMode === 'edit' ? 'Editing' : 'Create'}</span>
                <span className="hidden sm:inline">{viewMode === 'edit' ? ' Post' : ' New'}</span>
              </button>
              <button 
                onClick={() => setViewMode('manage')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'manage' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <List size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline">Manage</span>
                <span className="hidden sm:inline"> Posts</span>
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors shrink-0 hidden sm:block">
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto relative">
          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 left-8 right-8 z-50 bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl flex items-center justify-between"
              >
                <p className="text-sm font-medium">{error}</p>
                <button onClick={() => setError(null)}><X size={18} /></button>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 left-8 right-8 z-50 bg-green-50 border border-green-200 text-green-600 px-6 py-4 rounded-2xl flex items-center justify-between"
              >
                <p className="text-sm font-medium">{success}</p>
                <button onClick={() => setSuccess(null)}><X size={18} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {deleteConfirmId && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[60] bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-8"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
                >
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Delete Story?</h3>
                  <p className="text-stone-500 mb-8">This action cannot be undone. Are you sure you want to remove this story?</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleDelete(deleteConfirmId)}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {viewMode === 'manage' ? (
              <motion.div
                key="manage"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 sm:p-8"
              >
                <div className="grid grid-cols-1 gap-4">
                  {posts.length === 0 ? (
                    <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
                      <LayoutGrid className="mx-auto text-stone-300 mb-4" size={48} />
                      <p className="text-stone-500 font-medium">No posts found in the database.</p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-africa-gold/30 transition-all group">
                        <img src={post.image} className="w-full sm:w-24 h-48 sm:h-24 rounded-xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                        <div className="flex-grow w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-africa-earth bg-africa-earth/10 px-2 py-0.5 rounded-full">
                              {post.category}
                            </span>
                            <span className="text-xs text-stone-400">• {post.date}</span>
                          </div>
                          <h3 className="font-bold text-stone-900 line-clamp-1">{post.title}</h3>
                          <p className="text-sm text-stone-500 line-clamp-2 sm:line-clamp-1">{post.excerpt}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                          <button 
                            onClick={() => handleEdit(post)}
                            className="flex-1 sm:flex-none p-3 bg-white text-stone-600 hover:text-africa-earth rounded-xl shadow-sm border border-stone-100 transition-all flex items-center justify-center gap-2"
                            title="Edit Story"
                          >
                            <Edit3 size={18} />
                            <span className="sm:hidden text-xs font-bold">Edit</span>
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(post.id)}
                            className="flex-1 sm:flex-none p-3 bg-white text-stone-600 hover:text-red-600 rounded-xl shadow-sm border border-stone-100 transition-all flex items-center justify-center gap-2"
                            title="Delete Story"
                          >
                            <Trash2 size={18} />
                            <span className="sm:hidden text-xs font-bold">Delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit}
                className="p-8 space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Story Title</label>
                      <input
                        required
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. The Hidden Gems of Zanzibar"
                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-africa-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Excerpt (Short Summary)</label>
                      <textarea
                        required
                        value={formData.excerpt}
                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        placeholder="A brief teaser for the story..."
                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-africa-gold h-24 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value as Post['category'] })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-africa-gold"
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Region</label>
                        <select
                          value={formData.region}
                          onChange={(e) => setFormData({ ...formData, region: e.target.value as Post['region'] })}
                          className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-africa-gold"
                        >
                          {regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Image URL</label>
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                        <input
                          required
                          type="url"
                          value={formData.image}
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-africa-gold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Full Content</label>
                      <textarea
                        required
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Tell the full story here... (Use double newlines for paragraphs)"
                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-africa-gold h-[380px] resize-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {viewMode !== 'manage' && (
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-stone-100 bg-stone-50 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 items-stretch sm:items-center">
            {viewMode === 'edit' && editingPostId && (
              <button
                onClick={() => setDeleteConfirmId(editingPostId)}
                className="sm:mr-auto px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-100 sm:border-transparent"
              >
                <Trash2 size={18} />
                Delete Post
              </button>
            )}
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => { setViewMode('manage'); resetForm(); }}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-3 text-stone-600 font-bold hover:bg-stone-200 rounded-xl transition-colors border border-stone-200 sm:border-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-6 sm:px-12 py-3 bg-africa-earth text-white font-bold rounded-xl hover:bg-africa-earth/90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span className="sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>{viewMode === 'edit' ? 'Update' : 'Publish'}</span>
                    <span className="hidden sm:inline"> Story</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
