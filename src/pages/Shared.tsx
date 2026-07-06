import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import AuthGuard from '../components/AuthGuard';
import { Plus, Trash2, Share2, Youtube, Globe, ExternalLink, X, Search } from 'lucide-react';
import { SharedLink } from '../types';
import { format } from 'date-fns';

// Extract keywords function for automated SEO insertion
export function extractKeywords(title: string): string[] {
  if (!title) return [];
  const cleaned = title.replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ');
  const words = cleaned.split(/\s+/);
  const noise = new Set([
    '위한', '그리고', '또는', '하는', '에서', '으로', '있다', '없다', '대한', '통한', '함께', '함께하는',
    '방법', '소개', '추천', '관한', '기반', '활용', '이용', '관련', '모음', '정리', '공유', '자료', '뉴스',
    '이유', '어떻게', '무엇', '쉬운', '만들기', '하는법', '하는방법', '하기', '하는', '한다', '했다', '입니다'
  ]);
  
  const keywords = words
    .map(w => w.trim())
    .filter(w => {
      const lower = w.toLowerCase();
      if (lower.length < 2) {
        return ['ai', 'sw', 'it', 'vr', 'ar'].includes(lower);
      }
      return !noise.has(w) && !/^\d+$/.test(w);
    });
    
  return Array.from(new Set(keywords));
}

export default function SharedPage() {
  const [user] = useAuthState(auth);
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [type, setType] = useState<'youtube' | 'article'>('youtube');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Dynamic SEO keywords metadata update
  useEffect(() => {
    if (links.length > 0) {
      const allExtractedKeywords: string[] = [];
      links.forEach((link) => {
        const kw = link.keywords && link.keywords.length > 0 
          ? link.keywords 
          : extractKeywords(link.title || '');
        allExtractedKeywords.push(...kw);
      });

      const uniqueNewKeywords = Array.from(new Set(allExtractedKeywords))
        .filter(k => k.length >= 2)
        .slice(0, 35);

      const baseKeywords = [
        "꿈만아", "꿈만아 강사", "꿈만아 포트폴리오", "AI전문강사", "충북 AI강사", 
        "AISW 강사", "AI윤리", "AI안전", "AI바이브코딩 강사", "바이브코딩 강사", "AI실무 강사"
      ];

      const mergedKeywords = Array.from(new Set([...baseKeywords, ...uniqueNewKeywords]));

      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', mergedKeywords.join(', '));
      }

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const defaultDesc = "PBL(프로젝트 기반 학습) 방식의 AI, SW, 과학 교육 전문강사 꿈만아의 공식 포트폴리오입니다.";
        const keywordSnippet = uniqueNewKeywords.slice(0, 6).join(', ');
        if (keywordSnippet) {
          metaDesc.setAttribute('content', `${defaultDesc} 공유 자료 키워드: ${keywordSnippet} 등 최신자료를 제공합니다.`);
        }
      }
    }
  }, [links]);

  useEffect(() => {
    // Handle incoming shared links from Web Share Target API
    const sharedTitle = searchParams.get('title');
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');

    if (sharedTitle || sharedText || sharedUrl) {
      let extractedUrl = sharedUrl || '';
      
      // Android share sheet often puts the URL in the 'text' field
      if (!extractedUrl && sharedText) {
        const urlMatch = sharedText.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          extractedUrl = urlMatch[0];
        }
      }

      let extractedTitle = sharedTitle || '';
      if (!extractedTitle && sharedText && sharedText !== extractedUrl) {
         extractedTitle = sharedText.replace(extractedUrl, '').trim();
      }

      if (extractedUrl || extractedTitle) {
        setUrl(extractedUrl);
        setTitle(extractedTitle);
        setIsAdding(true);
        
        // Clear the URL parameters so it doesn't trigger again on refresh
        navigate('/shared', { replace: true });
      }
    }
  }, [searchParams, navigate]);

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
      }

      // Extract keywords
      let linkKeywords: string[] = [];
      if (keywordsInput.trim()) {
        linkKeywords = keywordsInput
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);
      } else if (finalTitle) {
        linkKeywords = extractKeywords(finalTitle);
      } else {
        linkKeywords = extractKeywords(url);
      }

      // 1. Add document immediately
      const docRef = await addDoc(collection(db, 'sharedLinks'), {
        url,
        title: finalTitle || url,
        thumbnail,
        type: detectedType,
        keywords: linkKeywords,
        createdAt: serverTimestamp(),
        authorUid: user.uid
      });

      // 2. Close modal and clear inputs immediately
      setIsAdding(false);
      setUrl('');
      setTitle('');
      setKeywordsInput('');

      // 3. Fetch metadata in the background if it's an article
      if (detectedType === 'article') {
        try {
          const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
          const data = await res.json();
          if (data.status === 'success') {
            const fetchedTitle = data.data.title;
            const fetchedThumbnail = data.data.image?.url || data.data.logo?.url || '';
            
            if (fetchedTitle || fetchedThumbnail) {
              const updatedFields: any = {
                title: finalTitle || fetchedTitle || url,
                thumbnail: fetchedThumbnail
              };

              // Automatically extract keywords from fetched title if user didn't enter custom ones
              if (!keywordsInput.trim()) {
                updatedFields.keywords = extractKeywords(finalTitle || fetchedTitle || url);
              }

              await updateDoc(docRef, updatedFields);
            }
          }
        } catch (e) {
          console.error('Metadata fetch failed', e);
        }
      }
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

  const filteredLinks = useMemo(() => {
    return links.filter(link => 
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [links, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            공유 자료
            <span className="text-sm sm:text-xl text-slate-400 ml-2 font-medium">(Shared Resources)</span>
          </h1>
          <p className="mt-2 text-slate-500">유튜브 영상 및 최신 뉴스, 자료 등</p>
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

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="자료 제목이나 URL로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
        />
      </div>

      <AuthGuard>
        {isAdding && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 gap-4">
              <input
                type="url"
                placeholder="공유할 URL (유튜브 또는 기사)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <input
                type="text"
                placeholder="제목 (선택사항)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <input
                type="text"
                placeholder="검색 키워드/태그 (선택사항, 쉼표로 구분. 예: AI안전, 바이브코딩, 교육)"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={type === 'youtube'} onChange={() => setType('youtube')} className="text-indigo-600 focus:ring-indigo-500" /> 유튜브
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={type === 'article'} onChange={() => setType('article')} className="text-indigo-600 focus:ring-indigo-500" /> 기사/웹사이트
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                추가하기
              </button>
            </div>
          </div>
        )}
      </AuthGuard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
            <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {searchTerm ? '검색 결과가 없습니다.' : '공유된 자료가 없습니다.'}
            </p>
          </div>
        ) : (
          filteredLinks.map((item) => (
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
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    {item.title}
                  </a>
                </h3>

                {/* Keywords list for visual indexing and easy search filtration */}
                {((item.keywords && item.keywords.length > 0) || extractKeywords(item.title || '').length > 0) && (
                  <div className="flex flex-wrap gap-1 mb-4 flex-1 align-start content-start">
                    {(item.keywords && item.keywords.length > 0 
                      ? item.keywords 
                      : extractKeywords(item.title || '')
                    ).slice(0, 6).map((kw, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer border border-slate-100"
                        onClick={(e) => {
                          e.preventDefault();
                          setSearchTerm(kw);
                        }}
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}

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
