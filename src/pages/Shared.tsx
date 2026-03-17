import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import AuthGuard from '../components/AuthGuard';
import { Plus, Trash2, Share2, Youtube, Globe, ExternalLink, X } from 'lucide-react';
import { SharedLink } from '../types';
import { format } from 'date-fns';

export default function SharedPage() {
  const [user] = useAuthState(auth);
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'youtube' | 'article'>('youtube');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'sharedLinks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SharedLink));
      setLinks(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sharedLinks');
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!user || !url) return;
    try {
      let detectedType = type;
      let thumbnail = '';
      let finalTitle = title;

      // YouTube detection and thumbnail
      const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/);
      if (ytMatch) {
        detectedType = 'youtube';
        const videoId = ytMatch[1];
        thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      } else if (detectedType === 'article') {
        // For articles, we try to fetch metadata using a public API
        try {
          const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
          const data = await res.json();
          if (data.status === 'success') {
            if (!finalTitle) finalTitle = data.data.title;
            thumbnail = data.data.image?.url || data.data.logo?.url || '';
          }
        } catch (e) {
          console.error('Metadata fetch failed', e);
        }
      }

      await addDoc(collection(db, 'sharedLinks'), {
        url,
        title: finalTitle || url,
        thumbnail,
        type: detectedType,
        createdAt: serverTimestamp(),
        authorUid: user.uid
      });
      setIsAdding(false);
      setUrl('');
      setTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sharedLinks');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'sharedLinks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sharedLinks/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            공유 자료
            <span className="text-sm sm:text-xl text-slate-400 ml-2 font-medium">(Shared Resources)</span>
          </h1>
          <p className="mt-2 text-slate-500">유용한 유튜브 영상 및 최신 뉴스 기사 큐레이션</p>
        </div>
        <AuthGuard>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isAdding ? '취소하기' : '링크 추가'}
            </span>
          </button>
        </AuthGuard>
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 gap-4">
            <input
              type="url"
              placeholder="공유할 URL (유튜브 또는 기사)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="제목 (선택사항)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={type === 'youtube'} onChange={() => setType('youtube')} /> 유튜브
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={type === 'article'} onChange={() => setType('article')} /> 기사/웹사이트
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              추가하기
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : links.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
            <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">공유된 자료가 없습니다.</p>
          </div>
        ) : (
          links.map((item) => (
            <div key={item.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col">
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden block"
              >
                {item.thumbnail ? (
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : item.type === 'youtube' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                    <Youtube className="w-12 h-12 text-red-600" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-indigo-50">
                    <Globe className="w-12 h-12 text-indigo-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                    <ExternalLink className="w-5 h-5 text-slate-900" />
                  </div>
                </div>
              </a>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {item.type === 'youtube' ? 'YouTube' : 'Article'}
                  </span>
                  <AuthGuard>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        item.id && handleDelete(item.id);
                      }}
                      className="p-1 text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AuthGuard>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 line-clamp-2 flex-1">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    {item.title}
                  </a>
                </h3>
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
                  <span className="text-xs text-slate-400">
                    {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'yyyy.MM.dd') : '방금 전'}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    방문하기 <ExternalLink className="w-3 h-3" />
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
