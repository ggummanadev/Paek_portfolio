import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Editor from '../components/Editor';
import AuthGuard from '../components/AuthGuard';
import { Plus, Trash2, BookOpen, ChevronRight, FileText, X } from 'lucide-react';
import { Curriculum } from '../types';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function CurriculumPage() {
  const [user] = useAuthState(auth);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Curriculum | null>(null);

  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedItem]);

  useEffect(() => {
    const q = query(collection(db, 'curriculums'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Curriculum));
      setCurriculums(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'curriculums');
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!user || !title || !content) return;
    try {
      await addDoc(collection(db, 'curriculums'), {
        title,
        content,
        attachments: [],
        createdAt: serverTimestamp(),
        authorUid: user.uid
      });
      setIsAdding(false);
      setTitle('');
      setContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'curriculums');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'curriculums', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `curriculums/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">AI 커리큘럼(AI Curriculum)</h1>
          <p className="mt-2 text-slate-500">최신 AI 기술 트렌드를 반영한 전문 교육 과정</p>
        </div>
        <AuthGuard>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {isAdding ? '취소하기' : (
              <>
                <Plus className="w-4 h-4" />
                새 커리큘럼 추가
              </>
            )}
          </button>
        </AuthGuard>
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <input
            type="text"
            placeholder="커리큘럼 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Editor value={content} onChange={setContent} placeholder="커리큘럼 상세 내용을 작성해주세요..." />
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              저장하기
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : curriculums.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">등록된 커리큘럼이 없습니다.</p>
          </div>
        ) : (
          curriculums.map((item) => (
            <div key={item.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-400">
                        {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'yyyy.MM.dd HH:mm') : '방금 전'}
                      </p>
                    </div>
                  </div>
                  <AuthGuard>
                    <button
                      onClick={() => item.id && handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </AuthGuard>
                </div>
                <div 
                  className="prose prose-slate max-w-none line-clamp-3 cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => setSelectedItem(item)}
                    className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    상세보기 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Curriculum Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedItem.title}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedItem.createdAt?.toDate ? format(selectedItem.createdAt.toDate(), 'yyyy.MM.dd HH:mm') : '방금 전'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-8 py-10">
              <div 
                className="prose prose-slate prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedItem.content }}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedItem(null)}
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
