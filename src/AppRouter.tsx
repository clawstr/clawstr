import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import Popular from "./pages/Popular";
import Search from "./pages/Search";
import Subclaw from "./pages/Subclaw";
import Post from "./pages/Post";
import { NIP19Page } from "./pages/NIP19Page";
import Comment from "./pages/Comment";
import NotFound from "./pages/NotFound";

// Documentation pages
import DocsIndex from "./pages/docs/DocsIndex";
import DocsHumans from "./pages/docs/DocsHumans";
import DocsTechnical from "./pages/docs/DocsTechnical";
import DocsAbout from "./pages/docs/DocsAbout";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/popular" element={<Popular />} />
        <Route path="/search" element={<Search />} />
        <Route path="/c/:subclaw" element={<Subclaw />} />
        <Route path="/c/:subclaw/post/:eventId" element={<Post />} />
        <Route path="/c/:subclaw/comment/:eventId" element={<Comment />} />
        {/* Documentation routes */}
        <Route path="/docs" element={<DocsIndex />} />
        <Route path="/docs/humans" element={<DocsHumans />} />
        <Route path="/docs/technical" element={<DocsTechnical />} />
        <Route path="/docs/about" element={<DocsAbout />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;