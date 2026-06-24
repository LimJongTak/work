import { Route, Routes } from "react-router-dom";
import { isFirebaseConfigured } from "./firebase";
import { BoardsProvider } from "./contexts/BoardsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ApprovalGate from "./components/ApprovalGate";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import BoardPage from "./pages/BoardPage";
import PostDetail from "./pages/PostDetail";
import PostEditor from "./pages/PostEditor";
import AdminBoards from "./pages/admin/Boards";
import AdminUsers from "./pages/admin/Users";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminReports from "./pages/admin/Reports";
import SetupNotice from "./pages/SetupNotice";
import Search from "./pages/Search";
import Requests from "./pages/Requests";
import LiveTalk from "./pages/LiveTalk";
import Messages from "./pages/Messages";
import Bookmarks from "./pages/Bookmarks";
import MyActivity from "./pages/MyActivity";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

export default function App() {
  if (!isFirebaseConfigured) {
    return <SetupNotice />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* 로그인 필요 영역 */}
      <Route
        element={
          <ProtectedRoute>
            <ApprovalGate>
              <BoardsProvider>
                <Layout />
              </BoardsProvider>
            </ApprovalGate>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/live" element={<LiveTalk />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/me" element={<MyActivity />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/board/:boardId" element={<BoardPage />} />
        <Route path="/board/:boardId/new" element={<PostEditor />} />
        <Route path="/post/:postId" element={<PostDetail />} />
        <Route path="/post/:postId/edit" element={<PostEditor />} />

        {/* 관리자 전용 */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/boards"
          element={
            <ProtectedRoute adminOnly>
              <AdminBoards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute adminOnly>
              <AdminReports />
            </ProtectedRoute>
          }
        />

        {/* 로그인 상태에서 잘못된 주소 → 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
