import { useState, useEffect } from 'react';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import Editor from '../components/Editor';
import AuthGuard from '../components/AuthGuard';
import { Edit2, Save, User as UserIcon } from 'lucide-react';

export default function Home() {
  const [user] = useAuthState(auth);
  const [content, setContent] = useState('');
  const [headline, setHeadline] = useState('PBL방식 AI,SW,Sci 교육 전문가');
  const [name, setName] = useState('Expert Instructor');
  const [specialty, setSpecialty] = useState('AI, SW Education, Web Design');
  const [experience, setExperience] = useState('20+ Years');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const isAdmin = user?.email === 'jabang78@gmail.com';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'profiles', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setContent(data.content || '');
          setHeadline(data.headline || 'PBL방식 AI,SW,Sci 교육 전문가');
          setName(data.name || 'Expert Instructor');
          setSpecialty(data.specialty || 'AI, SW Education, Web Design');
          setExperience(data.experience || '20+ Years');
          setPhotoUrl(data.photoUrl || '');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'profiles/main');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'profiles', 'main'), {
        content,
        headline,
        name,
        specialty,
        experience,
        photoUrl,
        updatedAt: serverTimestamp(),
        authorUid: user.uid
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'profiles/main');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoUrl(url);
    } catch (error) {
      console.error("Error uploading image: ", error);
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            강사 소개
            <span className="text-sm sm:text-xl text-slate-400 ml-2 font-medium">(Instructor Profile)</span>
          </h1>
          {isEditing ? (
            <input 
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mt-2 w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="헤드라인(Headline)"
            />
          ) : (
            <p className="mt-2 text-slate-500">{headline}</p>
          )}
        </div>
        <AuthGuard>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">수정하기(Edit)</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">저장하기(Save)</span>
            </button>
          )}
        </AuthGuard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24">
            <div className="aspect-square bg-slate-100 rounded-xl mb-6 flex items-center justify-center overflow-hidden border border-slate-100 relative group">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="w-24 h-24 text-slate-300" />
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                  <label className="cursor-pointer text-white text-sm font-medium hover:text-indigo-200 transition-colors">
                    {isUploading ? '업로드 중...' : '이미지 업로드'}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">이름(Name)</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-900">{name}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">전문분야(Specialty)</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={specialty} 
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                ) : (
                  <p className="text-slate-600">{specialty}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">경력(Experience)</label>
                {isEditing ? (
                  <textarea 
                    value={experience} 
                    onChange={(e) => setExperience(e.target.value)}
                    rows={5}
                    className="w-full mt-1 px-3 py-1.5 rounded border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="경력 사항을 입력하세요..."
                  />
                ) : (
                  <p className="text-slate-600 whitespace-pre-wrap">{experience}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isEditing ? (
            <div className="space-y-4">
              <Editor value={content} onChange={setContent} placeholder="강사 소개 내용을 작성해주세요..." />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 min-h-[400px]">
              <div 
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: content || '<p className="text-slate-400 italic">아직 작성된 내용이 없습니다.</p>' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
