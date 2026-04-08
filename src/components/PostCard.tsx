import { motion } from 'motion/react';
import { Post } from '../types';
import { Calendar, Clock, ArrowRight, Edit3 } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onClick: (post: Post) => void;
  isAdmin?: boolean;
  onManage?: (post: Post) => void;
  key?: string | number;
}

export default function PostCard({ post, onClick, isAdmin, onManage }: PostCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -8 }}
      className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100"
      onClick={() => onClick(post)}
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-africa-earth text-xs font-bold rounded-full uppercase tracking-wider">
            {post.category}
          </span>
          {isAdmin && onManage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManage(post);
              }}
              className="p-2 bg-africa-earth text-white rounded-full shadow-lg hover:scale-110 transition-all"
              title="Manage this post"
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center gap-4 text-stone-500 text-xs mb-3">
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>{post.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{post.readTime}</span>
          </div>
        </div>
        
        <h3 className="text-xl mb-3 group-hover:text-africa-sunset transition-colors">
          {post.title}
        </h3>
        
        <p className="text-stone-600 text-sm line-clamp-2 mb-4 leading-relaxed">
          {post.excerpt}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs font-medium text-stone-400">By {post.author}</span>
          <div className="flex items-center gap-1 text-africa-earth font-bold text-sm group-hover:gap-2 transition-all">
            Read More <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
