import { axiosClient } from "../axiosClient";
import type { NewsItem } from "../../types/news";

interface NewsListResponse {
  status: "success" | "error";
  data: { news: NewsItem[] };
}

interface NewsDetailResponse {
  status: "success" | "error";
  data: { news: NewsItem };
}

interface NewsActionResponse {
  status: "success" | "error";
  message: string;
  data: { news: NewsItem };
}

export async function getNews(params?: { search?: string; category?: string; tag?: string }) {
  const response = await axiosClient.get<NewsListResponse>("/news", { params });
  return response.data.data.news;
}

export async function getNewsBySlug(slug: string) {
  const response = await axiosClient.get<NewsDetailResponse>(`/news/${slug}`);
  return response.data.data.news;
}

export async function createNews(payload: {
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  isPublished?: boolean;
}) {
  const response = await axiosClient.post<NewsActionResponse>("/news", payload);
  return response.data;
}

export async function updateNews(newsId: string, payload: Partial<{ title: string; content: string; excerpt: string; category: string; isPublished: boolean }>) {
  const response = await axiosClient.put<NewsActionResponse>(`/news/${newsId}`, payload);
  return response.data;
}

export async function deleteNews(newsId: string) {
  const response = await axiosClient.delete<{ status: string; message: string }>(`/news/${newsId}`);
  return response.data;
}
