import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; // Import file bạn vừa tạo

function App() {
  return (
    <Router>
      <Routes>
        {/* Thiết lập trang Home là trang chủ mặc định */}
        <Route path="/" element={<Home />} />
        
        {/* Sau này Thanh làm Login sẽ thêm vào đây */}
        {/* <Route path="/login" element={<Login />} /> */}
      </Routes>
    </Router>
  );
}

export default App;