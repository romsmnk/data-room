import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import LoginPage from "@/pages/LoginPage";
import DataRoomsPage from "@/pages/DataRoomsPage";
import RoomBrowserPage from "@/pages/RoomBrowserPage";
import PublicSharePage from "@/pages/PublicSharePage";
import { Skeleton } from "@/components/ui/skeleton";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/share/:token" element={<PublicSharePage />} />
      <Route
        path="/rooms"
        element={
          <RequireAuth>
            <DataRoomsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/rooms/:roomId"
        element={
          <RequireAuth>
            <RoomBrowserPage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/rooms" replace />} />
      <Route path="*" element={<Navigate to="/rooms" replace />} />
    </Routes>
  );
}
