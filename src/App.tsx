import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CurriculumPage from './pages/Curriculum';
import LecturesPage from './pages/Lectures';
import ArticlesPage from './pages/Articles';
import SharedPage from './pages/Shared';
import PortfolioPage from './pages/Portfolio';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
        <h2 className="text-2xl font-bold text-red-600 mb-4">문제가 발생했습니다</h2>
        <p className="text-slate-600 mb-6">애플리케이션 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
        <div className="bg-slate-50 p-4 rounded-lg overflow-auto max-h-40 mb-6">
          <code className="text-xs text-slate-500">{error.message}</code>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
        >
          페이지 새로고침
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/curriculum" element={<CurriculumPage />} />
            <Route path="/lectures" element={<LecturesPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/shared" element={<SharedPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}
