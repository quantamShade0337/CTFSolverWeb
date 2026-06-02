import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { Home } from "./pages/Home.jsx";
import { Category } from "./pages/Category.jsx";
import { Guide } from "./pages/Guide.jsx";
import { Search } from "./pages/Search.jsx";
import { NotFound } from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="category/:slug" element={<Category />} />
        <Route path="guide/:id" element={<Guide />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
