export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'Sights' | 'Culture' | 'Food' | 'Adventure';
  region: 'North' | 'South' | 'East' | 'West' | 'Central';
  image: string;
  author: string;
  date: string;
  readTime: string;
  likesCount?: number;
}

export type Category = Post['category'] | 'All';
