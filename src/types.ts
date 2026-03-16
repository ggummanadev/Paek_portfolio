export interface Profile {
  id?: string;
  name?: string;
  specialty?: string;
  experience?: string;
  photoUrl?: string;
  content: string;
  updatedAt: any;
  authorUid: string;
}

export interface Curriculum {
  id?: string;
  title: string;
  content: string;
  attachments: string[];
  createdAt: any;
  authorUid: string;
}

export interface Lecture {
  id?: string;
  title: string;
  content: string;
  date: string;
  attachments: string[];
  createdAt: any;
  authorUid: string;
}

export interface Article {
  id?: string;
  title: string;
  content: string;
  type: 'novel' | 'column';
  createdAt: any;
  authorUid: string;
}

export interface SharedLink {
  id?: string;
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  type: 'youtube' | 'article';
  createdAt: any;
  authorUid: string;
}

export interface PortfolioItem {
  id?: string;
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  type: 'webapp' | 'googleplay' | 'youtube' | 'website';
  createdAt: any;
  authorUid: string;
}
