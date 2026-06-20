import { Routes, Route, Navigate } from "react-router-dom";
import { getToken } from "./api";
import Login from "./pages/Login";
import Home from "./pages/Home";
import History from "./pages/History";
import Settings from "./pages/Settings";

function Protected({ children }: { children: JSX.Element }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/history" element={<Protected><History /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
