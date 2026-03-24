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

interface UploadImageResponse {
  status: "success" | "error";
  message: string;
  data: { url: string; publicId: string };
}

export async function getNews(params?: { search?: string; category?: string; tag?: string; isPublished?: boolean }) {
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
  coverImage?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
}) {
  const response = await axiosClient.post<NewsActionResponse>("/news", payload);
  return response.data;
}

export async function updateNews(
  newsId: string,
  payload: Partial<{ title: string; content: string; excerpt: string; coverImage: string; category: string; tags: string[]; isPublished: boolean }>,
) {
  const response = await axiosClient.put<NewsActionResponse>(`/news/${newsId}`, payload);
  return response.data;
}

export async function uploadNewsImage(payload: {
  uri: string;
  type?: string;
  fileName?: string;
}) {
  const formData = new FormData();
  formData.append("image", {
    uri: payload.uri,
    type: payload.type || "image/jpeg",
    name: payload.fileName || `news-${Date.now()}.jpg`,
  } as unknown as Blob);

  const response = await axiosClient.post<UploadImageResponse>("/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data.url;
}

export async function deleteNews(newsId: string) {
  const response = await axiosClient.delete<{ status: string; message: string }>(`/news/${newsId}`);
  return response.data;
}
