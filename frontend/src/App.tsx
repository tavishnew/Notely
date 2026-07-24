import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import NoteView from "./pages/NoteView";
import Onboarding from "./pages/Onboarding";
import Landing from "./pages/Landing";
import { useApp } from "./lib/app";

export default function App() {
  const location = useLocation();
  const { ready, prefs } = useApp();

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center gap-2.5 bg-bg text-ink-faint">
        <Loader2 className="size-5 animate-spin text-accent" />
        <span className="font-display">Loading Notely...</span>
      </div>
    );
  }

  if (!prefs.onboarded && location.pathname !== "/onboarding" && location.pathname !== "/") {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/notes/:id" element={<Navigate to="/notes/:id/editor" replace />} />
      <Route path="/notes/:id/:view" element={<NoteView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
