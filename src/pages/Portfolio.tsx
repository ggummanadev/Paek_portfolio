import { useState, useEffect, useMemo } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import AuthGuard from '../components/AuthGuard';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Youtube, 
  Globe, 
  Smartphone, 
  Layout as LayoutIcon,
  Edit2,
  X,
  Save,
  Search
} from 'lucide-react';
import { PortfolioItem } from '../types';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PortfolioPage() {
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'webapp' | 'googleplay' | 'youtube' | 'website'>('webapp');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = user?.email === 'jabang78@gmail.com';

  useEffect(() => {
    const q = query(collection(db, 'portfolio'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const portfolioItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PortfolioItem));
      setItems(portfolioItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'portfolio');
    });
    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800; // Resize to max 800x800
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setThumbnail(dataUrl);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      alert("이미지를 읽는 중 오류가 발생했습니다.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  };

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setType('webapp');
    setDescription('');
    setThumbnail('');
    setIsAdding(false);
    setEditingItem(null);
  };

  const handleAdd = async () => {
    if (!user || !url || !title) return;
    try {
      let finalThumbnail = thumbnail;
      
      // Auto-detect YouTube thumbnail
      if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
        const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/);
        if (ytMatch && !finalThumbnail) {
          finalThumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
        }
      }

      await addDoc(collection(db, 'portfolio'), {
        title,
        url,
        type,
        description,
        thumbnail: finalThumbnail,
        createdAt: serverTimestamp(),
        authorUid: user.uid
      });
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'portfolio');
    }
  };

  const handleUpdate = async () => {
    if (!user || !editingItem?.id || !url || !title) return;
    try {
      let finalThumbnail = thumbnail;
      if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
        const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/);
        if (ytMatch && !finalThumbnail) {
          finalThumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
        }
      }

      await updateDoc(doc(db, 'portfolio', editingItem.id), {
        title,
        url,
        type,
        description,
        thumbnail: finalThumbnail,
      });
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `portfolio/${editingItem.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'portfolio', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `portfolio/${id}`);
    }
  };

  const startEditing = (item: PortfolioItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setUrl(item.url);
    setType(item.type);
    setDescription(item.description);
    setThumbnail(item.thumbnail || '');
    setIsAdding(true);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'youtube': return <Youtube className="w-5 h-5" />;
      case 'googleplay': return <Smartphone className="w-5 h-5" />;
      case 'webapp': return <LayoutIcon className="w-5 h-5" />;
      default: return <Globe className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            작품 소개
            <span className="text-sm sm:text-xl text-slate-400 ml-2 font-medium">(Portfolio)</span>
          </h1>
          <p className="mt-2 text-slate-500">직접 개발한 디지털 콘텐츠</p>
        </div>
        <AuthGuard>
          <button
            onClick={() => {
              if (isAdding) resetForm();
              else setIsAdding(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isAdding ? '취소하기' : '작품 등록'}
            </span>
          </button>
        </AuthGuard>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="작품 제목이나 설명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
        />
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">작품 제목</label>
              <input
                type="text"
                placeholder="예: AI 학습 도우미 웹앱"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">작품 유형</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="webapp">웹 애플리케이션</option>
                <option value="googleplay">구글 플레이 스토어 앱</option>
                <option value="youtube">유튜브 플레이리스트/영상</option>
                <option value="website">웹사이트</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">링크 URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">썸네일 이미지 (선택사항)</label>
            <div className="flex items-center gap-4">
              {thumbnail && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setThumbnail('')}
                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex-1">
                <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                  <span className="text-sm text-slate-500">
                    {isUploading ? '업로드 중...' : '이미지 파일 선택'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">유튜브 링크 입력 시 자동으로 썸네일이 추출됩니다.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">작품 설명</label>
            <textarea
              placeholder="작품에 대한 간단한 설명을 입력하세요..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={editingItem ? handleUpdate : handleAdd}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {editingItem ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingItem ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
            <LayoutIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {searchTerm ? '검색 결과가 없습니다.' : '등록된 작품이 없습니다.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all flex flex-col">
              <div className="aspect-video bg-slate-100 relative overflow-hidden">
                {item.thumbnail ? (
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    {getTypeIcon(item.type)}
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-sm",
                    item.type === 'youtube' ? "bg-red-500/90 text-white" :
                    item.type === 'googleplay' ? "bg-emerald-500/90 text-white" :
                    item.type === 'webapp' ? "bg-indigo-500/90 text-white" :
                    "bg-slate-700/90 text-white"
                  )}>
                    {getTypeIcon(item.type)}
                    {item.type}
                  </span>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 mr-2"
                  >
                    <h3 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                  </a>
                  <AuthGuard>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditing(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </AuthGuard>
                </div>
                
                <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
                  {item.description || '설명이 없습니다.'}
                </p>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'yyyy.MM.dd') : '방금 전'}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    자세히 보기 <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
