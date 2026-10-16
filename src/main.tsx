import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import { Shell } from "./components/Shell";
import { Home } from "./pages/Home";
import "@fontsource-variable/onest";
import "@fontsource/jetbrains-mono/400.css";
import "./styles.css";
const LabRoute = lazy(() =>
  import("./pages/Lab").then((m) => ({ default: m.LabRoute })),
);
const Sessions = lazy(() =>
  import("./pages/Sessions").then((m) => ({ default: m.Sessions })),
);
const Videos = lazy(() =>
  import("./pages/Videos").then((m) => ({ default: m.Videos })),
);
const Router =
  import.meta.env.VITE_STATIC_DEMO === "true" ? HashRouter : BrowserRouter;
createRoot(document.getElementById("root")!).render(
  <Router>
    <Suspense
      fallback={<div className="page loading-page">Загружаем лабораторию…</div>}
    >
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="lab/:id" element={<LabRoute />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="videos" element={<Videos />} />
          <Route
            path="*"
            element={
              <div className="page">
                <h1>Страница не найдена</h1>
                <Link to="/">Вернуться к лабораториям</Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  </Router>,
);
