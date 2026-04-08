import { motion } from 'motion/react';
import { Post } from '../types';
import { ArrowLeft, Calendar, Clock, MapPin, User, Share2, Heart } from 'lucide-react';
import CommentSection from './CommentSection';
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';

interface PostDetailProps {
  post: Post;
  onBack: () => void;
}

export default function PostDetail({ post, onBack }: PostDetailProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);

  useEffect(() => {
    // Listen for likes count
    const unsubscribe = onSnapshot(doc(db, 'posts', post.id), (doc) => {
      if (doc.exists()) {
        setLikesCount(doc.data().likesCount || 0);
      }
    });

    // Check if current user liked
    if (auth.currentUser) {
      const likeRef = doc(db, 'posts', post.id, 'likes', auth.currentUser.uid);
      onSnapshot(likeRef, (doc) => {
        setIsLiked(doc.exists());
      });
    }

    return () => unsubscribe();
  }, [post.id]);

  const handleLike = async () => {
    if (!auth.currentUser) {
      alert('Please sign in to like posts');
      return;
    }

    const likeRef = doc(db, 'posts', post.id, 'likes', auth.currentUser.uid);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, { userId: auth.currentUser.uid, postId: post.id });
        await updateDoc(postRef, { likesCount: increment(1) });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href
      });
    } else {
      alert('Copy this link to share: ' + window.location.href);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-stone-50"
    >
      {/* Hero Section */}
      <div className="relative h-[60vh] w-full">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute top-8 left-8">
          <button
            onClick={onBack}
            className="p-3 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-all"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
        
        <div className="absolute bottom-12 left-0 w-full px-8 md:px-24">
          <div className="max-w-4xl">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="px-4 py-1 bg-africa-gold text-white text-sm font-bold rounded-full uppercase tracking-widest mb-4 inline-block">
                {post.category}
              </span>
              <h1 className="text-4xl md:text-6xl text-white mb-6 leading-tight">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-africa-gold" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-africa-gold" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-africa-gold" />
                  <span>{post.readTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-africa-gold" />
                  <span>{post.region} Africa</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Main Text */}
          <div className="flex-1">
            <div className="prose prose-stone prose-lg max-w-none">
              {post.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-stone-700 leading-relaxed mb-6 text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
            
            <div className="mt-12 pt-12 border-t border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all ${
                    isLiked 
                      ? 'bg-red-50 border-red-200 text-red-600' 
                      : 'border-stone-200 hover:bg-stone-100 text-stone-600'
                  }`}
                >
                  <Heart size={20} className={isLiked ? 'fill-current' : ''} />
                  <span className="font-bold">{likesCount}</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-3 rounded-full border border-stone-200 hover:bg-stone-100 text-stone-600 transition-all"
                >
                  <Share2 size={20} />
                  <span className="font-bold">Share</span>
                </button>
              </div>
            </div>

            <CommentSection postId={post.id} />
          </div>
          
          {/* Sidebar */}
          <div className="w-full md:w-64 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <h4 className="text-lg mb-4">About the Author</h4>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-africa-sand flex items-center justify-center text-africa-earth font-bold">
                  {post.author.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm">{post.author}</p>
                  <p className="text-xs text-stone-500">Travel Journalist</p>
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Passionate about uncovering the hidden gems of Africa and sharing the stories that make this continent so unique.
              </p>
            </div>
            
            <div className="bg-africa-earth p-6 rounded-2xl shadow-sm text-white">
              <h4 className="text-lg mb-4">Newsletter</h4>
              <p className="text-xs text-white/80 mb-4">
                Get the latest African travel stories delivered to your inbox.
              </p>
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-africa-gold"
              />
              <button className="w-full py-2 bg-africa-gold text-white font-bold rounded-lg hover:bg-africa-gold/90 transition-colors text-sm">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
