import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import TemporalMap from './pages/TemporalMap';
import TopicsRiver from './pages/TopicsRiver';
import InfluenceRiver from './pages/InfluenceRiver';

// HashRouter (not BrowserRouter) is used deliberately: GitHub Pages serves
// static files with no server-side rewrite rules, so a deep link or a
// browser refresh on e.g. /map would 404 under BrowserRouter's clean URLs.
// Hash-based routes (/#/map) always resolve to index.html first, then the
// router reads the hash client-side -- no server config needed.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<TemporalMap />} />
        <Route path="/topics" element={<TopicsRiver />} />
        <Route path="/influence" element={<InfluenceRiver />} />
      </Routes>
    </HashRouter>
  );
}
