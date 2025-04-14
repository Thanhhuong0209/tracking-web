// app.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Các trang component
const Home = () => (
  <div className="page">
    <h1>Trang Chủ</h1>
    <p>Đây là trang chính của website</p>
    <Link to="/about" className="nav-link">Về chúng tôi</Link>
  </div>
);

const About = () => (
  <div className="page">
    <h1>Giới Thiệu</h1>
    <p>Thông tin về công ty</p>
    <Link to="/" className="nav-link">Về trang chủ</Link>
  </div>
);

const Contact = () => (
  <div className="page">
    <h1>Liên Hệ</h1>
    <p>Email: contact@example.com</p>
    <Link to="/" className="nav-link">Về trang chủ</Link>
  </div>
);

const NotFound = () => (
  <div className="page">
    <h1>404 - Không tìm thấy trang</h1>
    <Link to="/" className="nav-link">Về trang chủ</Link>
  </div>
);

// Component chính
function App() {
  return (
    <Router>
      <nav className="navbar">
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/" className="nav-link">Trang chủ</Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className="nav-link">Giới thiệu</Link>
          </li>
          <li className="nav-item">
            <Link to="/contact" className="nav-link">Liên hệ</Link>
          </li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;