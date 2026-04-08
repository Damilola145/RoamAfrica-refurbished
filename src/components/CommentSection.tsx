import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { MessageSquare, Send, Trash2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: any;
}

interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Comment[];
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const commentData = {
        postId,
        userId: auth.currentUser?.uid || 'guest',
        userName: auth.currentUser?.displayName || guestName.trim() || 'Anonymous Traveler',
        userPhoto: auth.currentUser?.photoURL || '',
        text: newComment.trim(),
        createdAt: serverTimestamp(),
        isGuest: !auth.currentUser
      };

      await addDoc(collection(db, 'posts', postId, 'comments'), commentData);
      setNewComment('');
      setGuestName('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="mt-12 pt-12 border-t border-stone-200">
      <div className="flex items-center gap-2 mb-8">
        <MessageSquare size={24} className="text-africa-earth" />
        <h3 className="text-2xl font-display font-bold">Comments ({comments.length})</h3>
      </div>

      <form onSubmit={handleSubmit} className="mb-12">
        <div className="flex flex-col gap-4">
          {!auth.currentUser && (
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <User size={20} />
              </div>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name (optional)"
                className="flex-grow px-4 py-2 rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-africa-gold text-sm"
              />
            </div>
          )}
          <div className="flex gap-4">
            {auth.currentUser && (
              <div className="w-10 h-10 rounded-full bg-africa-sand flex-shrink-0 overflow-hidden">
                {auth.currentUser.photoURL ? (
                  <img src={auth.currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-africa-earth font-bold">
                    {auth.currentUser.displayName?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            )}
            <div className="flex-grow relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={auth.currentUser ? "Add a comment..." : "Share your thoughts..."}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-africa-gold resize-none"
                rows={3}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="absolute bottom-3 right-3 p-2 bg-africa-earth text-white rounded-xl hover:bg-africa-earth/90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Send size={18} />
                <span className="text-xs font-bold sm:inline hidden">Post</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-stone-200 flex-shrink-0 overflow-hidden">
                {comment.userPhoto ? (
                  <img src={comment.userPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm relative group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm">{comment.userName}</span>
                    {(auth.currentUser?.uid === comment.userId || isAdmin) && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed">{comment.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
