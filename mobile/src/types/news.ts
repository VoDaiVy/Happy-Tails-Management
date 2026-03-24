export interface NewsItem {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  publishedAt?: string;
  views?: number;
  createdAt?: string;
}
