import { useState, useEffect, useMemo } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Editor from '../components/Editor';
import AuthGuard from '../components/AuthGuard';
import { Plus, Trash2, Book, PenTool, ChevronRight, X, Search } from 'lucide-react';
import { Article } from '../types';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ArticlesPage() {
  const [user] = useAuthState(auth);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'novel' | 'column'>('column');
  const [filter, setFilter] = useState<'all' | 'novel' | 'column'>('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<'novel' | 'column'>('column');

  const checkContentSize = (content: string) => {
    const size = new Blob([content]).size;
    const limit = 1048576; // 1MB
    if (size > limit) {
      alert(`내용이 너무 큽니다. (현재: ${(size / 1024 / 1024).toFixed(2)}MB / 제한: 1MB)\n이미지가 포함되어 있다면 이미지 크기를 줄이거나 외부 링크를 사용해 주세요.`);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (selectedArticle) {
      document.body.style.overflow = 'hidden';
      if (!isEditing) {
        setEditTitle(selectedArticle.title);
        setEditContent(selectedArticle.content);
        setEditType(selectedArticle.type);
      }
    } else {
      document.body.style.overflow = 'unset';
      setIsEditing(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedArticle, isEditing]);

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      setArticles(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!user || !title || !content) return;
    if (!checkContentSize(content)) return;
    try {
      await addDoc(collection(db, 'articles'), {
        title,
        content,
        type,
        createdAt: serverTimestamp(),
        authorUid: user.uid
      });
      setIsAdding(false);
      setTitle('');
      setContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'articles');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'articles', id));
      if (selectedArticle?.id === id) setSelectedArticle(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `articles/${id}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedArticle?.id || !editTitle || !editContent) return;
    if (!checkContentSize(editContent)) return;
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'articles', selectedArticle.id), {
        title: editTitle,
        content: editContent,
        type: editType,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      setSelectedArticle({
        ...selectedArticle,
        title: editTitle,
        content: editContent,
        type: editType
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `articles/${selectedArticle.id}`);
    }
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesFilter = filter === 'all' || a.type === filter;
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           a.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [articles, filter, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            소설 & 칼럼
            <span className="text-sm sm:text-xl text-slate-400 ml-2 font-medium">(Articles)</span>
          </h1>
          <p className="mt-2 text-slate-500">창작 소설과 칼럼</p>
        </div>
        <AuthGuard>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isAdding ? '취소하기' : '새 글 작성'}
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
          placeholder="글 제목이나 내용으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
        />
      </div>

      <div className="flex gap-2">
        {(['all', 'novel', 'column'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
              filter === f 
                ? "bg-slate-900 text-white border-slate-900" 
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            {f === 'all' ? '전체' : f === 'novel' ? '소설' : '칼럼'}
          </button>
        ))}
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="글 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'novel' | 'column')}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="column">칼럼</option>
              <option value="novel">소설</option>
            </select>
          </div>
          <Editor value={content} onChange={setContent} placeholder="글 내용을 작성해주세요..." />
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              발행하기
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
            <PenTool className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {searchTerm ? '검색 결과가 없습니다.' : '등록된 글이 없습니다.'}
            </p>
          </div>
        ) : (
          filteredArticles.map((item) => (
            <article key={item.id} className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all">
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    item.type === 'novel' 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : "bg-indigo-50 text-indigo-600 border-indigo-100"
                  )}>
                    {item.type === 'novel' ? 'Novel' : 'Column'}
                  </span>
                  <AuthGuard>
                    <button
                      onClick={() => item.id && handleDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AuthGuard>
                </div>
                <h3 
                  onClick={() => setSelectedArticle(item)}
                  className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2 cursor-pointer"
                >
                  {item.title}
                </h3>
                <div 
                  className="text-slate-600 line-clamp-4 prose prose-sm max-w-none cursor-pointer"
                  onClick={() => setSelectedArticle(item)}
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              </div>
              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'yyyy.MM.dd') : '방금 전'}
                </span>
                <button 
                  onClick={() => setSelectedArticle(item)}
                  className="flex items-center gap-1 text-sm font-semibold text-slate-900 hover:gap-2 transition-all"
                >
                  Read More <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedArticle(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                  selectedArticle.type === 'novel' 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-indigo-50 text-indigo-600 border-indigo-100"
                )}>
                  {selectedArticle.type === 'novel' ? 'Novel' : 'Column'}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedArticle.createdAt?.toDate ? format(selectedArticle.createdAt.toDate(), 'yyyy.MM.dd') : '방금 전'}
                </span>
              </div>
              <button 
                onClick={() => setSelectedArticle(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-8 py-10">
              {isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="글 제목"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as 'novel' | 'column')}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="column">칼럼</option>
                      <option value="novel">소설</option>
                    </select>
                  </div>
                  <Editor value={editContent} onChange={setEditContent} placeholder="글 내용을 작성해주세요..." />
                </div>
              ) : (
                <>
                  <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
                    {selectedArticle.title}
                  </h2>
                  <div 
                    className="prose prose-slate prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                  />
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <AuthGuard>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleUpdate}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        저장하기
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      수정하기
                    </button>
                  )}
                </div>
              </AuthGuard>
              <button 
                onClick={() => setSelectedArticle(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
