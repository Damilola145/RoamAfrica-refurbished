import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Menu, X, Search, Instagram, Twitter, Facebook, Globe, LogIn, LogOut, ShieldCheck, Plus, Database, LayoutGrid } from 'lucide-react';
import { db, auth, googleProvider, signInWithPopup, signOut } from './firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { posts as mockPosts } from './data/posts';
import { Post, Category } from './types';
import PostCard from './components/PostCard';
import PostDetail from './components/PostDetail';
import AdminPanel from './components/AdminPanel';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminInitialViewMode, setAdminInitialViewMode] = useState<'create' | 'manage' | 'edit'>('create');
  const [adminInitialPost, setAdminInitialPost] = useState<Post | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Post[];
      setPosts(postsData);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const seedData = async () => {
    if (!isAdmin || isSeeding) return;
    setIsSeeding(true);
    try {
      for (const post of mockPosts) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...postData } = post;
        await addDoc(collection(db, 'posts'), {
          ...postData,
          authorUid: user?.uid,
          createdAt: serverTimestamp(),
          likesCount: 0
        });
      }
      console.log('Mock posts seeded successfully!');
    } catch (error) {
      console.error('Seeding failed:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const displayPosts = useMemo(() => {
    // If we have any posts in Firestore, use them.
    // Otherwise, use mock posts.
    return posts.length > 0 ? posts : mockPosts;
  }, [posts]);

  const heroImages = [
    {
      url: 'https://images.unsplash.com/photo-1589834390005-5d4fb9bf3d32?auto=format&fit=crop&q=80&w=1920',
      caption: 'Mount Kilimanjaro, Tanzania'
    },
    {
      url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80&w=1920',
      caption: 'Safari Wildlife, South Africa'
    },
    {
      url: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&q=80&w=1920',
      caption: 'Pyramids of Giza, Egypt'
    },
    {
      url: 'https://images.unsplash.com/photo-1575351881847-b3bf188d9d0a?auto=format&fit=crop&q=80&w=1920',
      caption: 'Namib Desert, Namibia'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const categories: Category[] = ['All', 'Sights', 'Culture', 'Food', 'Adventure'];

  const filteredPosts = useMemo(() => {
    if (activeCategory === 'All') return displayPosts;
    return displayPosts.filter(post => post.category === activeCategory);
  }, [activeCategory, displayPosts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <Compass className="text-africa-earth animate-spin" size={48} />
          <p className="text-stone-500 font-display font-bold tracking-widest uppercase text-xs">Loading ROAM Africa...</p>
        </div>
      </div>
    );
  }

  if (selectedPost) {
    return (
      <PostDetail
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveCategory('All')}>
              <Compass className="text-africa-earth" size={32} />
              <span className="text-2xl font-display font-bold tracking-tighter text-stone-900">
                ROAM <span className="text-africa-earth">Africa</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-sm font-medium transition-colors hover:text-africa-earth ${
                    activeCategory === cat ? 'text-africa-earth' : 'text-stone-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <div className="h-6 w-px bg-stone-200 mx-2" />
              
              {user ? (
                <div className="flex items-center gap-4">
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setAdminInitialViewMode('create');
                          setAdminInitialPost(null);
                          setIsAdminPanelOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-africa-earth text-white rounded-full text-xs font-bold hover:bg-africa-earth/90 transition-all shadow-sm"
                      >
                        <LayoutGrid size={16} />
                        Admin Panel
                      </button>
                      <button
                        onClick={seedData}
                        disabled={isSeeding}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-full text-xs font-bold hover:bg-stone-200 transition-all disabled:opacity-50"
                      >
                        <Database size={16} />
                        {isSeeding ? '...' : 'Seed'}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-stone-200" />
                    <button onClick={handleLogout} className="text-stone-500 hover:text-red-500 transition-colors">
                      <LogOut size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-3 px-4 py-2 bg-white text-stone-700 rounded-full text-xs font-bold hover:bg-stone-50 transition-all border border-stone-200 shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                  </svg>
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-stone-900"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-stone-100 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setIsMenuOpen(false);
                    }}
                    className={`block w-full text-left text-lg font-medium ${
                      activeCategory === cat ? 'text-africa-earth' : 'text-stone-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <div className="pt-4 border-t border-stone-100">
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border border-stone-200" />
                        <div>
                          <p className="font-bold text-sm">{user.displayName}</p>
                          <p className="text-xs text-stone-500">{user.email}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setIsAdminPanelOpen(true);
                              setIsMenuOpen(false);
                            }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-africa-earth text-white rounded-xl font-bold"
                          >
                            <Plus size={20} />
                            New Post
                          </button>
                          <button
                            onClick={seedData}
                            disabled={isSeeding}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-stone-100 text-stone-600 rounded-xl font-bold disabled:opacity-50"
                          >
                            <Database size={20} />
                            {isSeeding ? 'Seeding...' : 'Seed Mock Posts'}
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold"
                      >
                        <LogOut size={20} />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleLogin}
                      className="flex items-center justify-center gap-3 w-full py-4 bg-white text-stone-700 rounded-xl font-bold border border-stone-200 shadow-sm"
                    >
                      <svg width="24" height="24" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                        <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                        <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                        <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                      </svg>
                      Sign In with Google
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentHeroImage}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <img
                src={heroImages[currentHeroImage].url}
                alt={heroImages[currentHeroImage].caption}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30" />
            </motion.div>
          </AnimatePresence>
          
          <div className="relative z-10 text-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <h1 className="text-6xl md:text-9xl text-white mb-4 tracking-tighter font-bold">
                ROAM <span className="text-africa-gold">Africa</span>
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-10 font-light tracking-[0.2em] uppercase">
                The Soul of the Motherland
              </p>
              <button 
                onClick={() => {
                  const el = document.getElementById('posts');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-12 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold rounded-full hover:bg-white hover:text-stone-900 transition-all duration-500 uppercase tracking-widest text-sm"
              >
                Explore
              </button>
            </motion.div>
          </div>

          {/* Carousel Indicators */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentHeroImage(idx)}
                className={`h-1.5 transition-all duration-500 rounded-full ${
                  currentHeroImage === idx ? 'w-8 bg-africa-gold' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Image Caption */}
          <div className="absolute bottom-12 right-12 z-20 hidden md:block">
            <p className="text-white/60 text-xs uppercase tracking-widest font-medium">
              {heroImages[currentHeroImage].caption}
            </p>
          </div>
        </section>

        {/* Featured Section */}
        <section id="posts" className="py-24 bg-stone-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <h2 className="text-4xl md:text-5xl mb-4">Latest Stories</h2>
                <p className="text-stone-500 max-w-md">
                  Handpicked travel experiences, cultural insights, and culinary adventures from across the continent.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                      activeCategory === cat
                        ? 'bg-africa-earth text-white shadow-md'
                        : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredPosts.map((post, index) => (
                  <PostCard
                    key={post.id || `mock-${index}`}
                    post={post}
                    onClick={setSelectedPost}
                    isAdmin={isAdmin}
                    onManage={(p) => {
                      setAdminInitialViewMode('edit');
                      setAdminInitialPost(p);
                      setIsAdminPanelOpen(true);
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
            
            {filteredPosts.length === 0 && (
              <div className="text-center py-24">
                <p className="text-stone-400 text-xl">No stories found in this category yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-24 bg-africa-earth relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-africa-gold/20 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-africa-sunset/20 rounded-full blur-3xl -ml-48 -mb-48" />
          
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl text-white mb-6">Join the Journey</h2>
            <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
              Subscribe to our newsletter and receive a weekly dose of African inspiration, travel tips, and exclusive stories.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-grow px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-africa-gold"
              />
              <button className="px-8 py-4 bg-africa-gold text-white font-bold rounded-full hover:bg-africa-gold/90 transition-all shadow-lg">
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Compass className="text-africa-gold" size={32} />
                <span className="text-2xl font-display font-bold tracking-tighter">
                  ROAM <span className="text-africa-gold">Africa</span>
                </span>
              </div>
              <p className="text-stone-400 max-w-sm leading-relaxed mb-8">
                ROAM Africa is dedicated to showcasing the authentic beauty, diverse cultures, and incredible stories of the African continent. Our mission is to inspire mindful travel and deeper connections.
              </p>
              <div className="flex gap-4">
                <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-africa-gold transition-colors">
                  <Instagram size={20} />
                </a>
                <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-africa-gold transition-colors">
                  <Twitter size={20} />
                </a>
                <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-africa-gold transition-colors">
                  <Facebook size={20} />
                </a>
                <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-africa-gold transition-colors">
                  <Globe size={20} />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-stone-400">
                <li><a href="#" className="hover:text-africa-gold transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-africa-gold transition-colors">Destinations</a></li>
                <li><a href="#" className="hover:text-africa-gold transition-colors">Travel Guides</a></li>
                <li><a href="#" className="hover:text-africa-gold transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-6">Categories</h4>
              <ul className="space-y-4 text-stone-400">
                <li><a href="#" className="hover:text-africa-gold transition-colors">Sights & Landmarks</a></li>
                <li><a href="#" className="hover:text-africa-gold transition-colors">Cultural Heritage</a></li>
                <li><a href="#" className="hover:text-africa-gold transition-colors">Food & Cuisine</a></li>
                <li><a href="#" className="hover:text-africa-gold transition-colors">Adventure Travel</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-stone-500 text-sm">
            <p>© 2024 ROAM Africa. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {isAdminPanelOpen && (
          <AdminPanel 
            onClose={() => setIsAdminPanelOpen(false)} 
            initialViewMode={adminInitialViewMode}
            initialPost={adminInitialPost}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
