import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SessionCreated from "./pages/SessionCreated";
import VotePage from "./pages/VotePage";
import DisplayPage from "./pages/DisplayPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session-created/:code" element={<SessionCreated />} />
        <Route path="/vote/:code" element={<VotePage />} />
        <Route path="/display/:code" element={<DisplayPage />} />
        <Route path="/admin/:code" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

