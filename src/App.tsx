import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Admin from './Admin'
import Home from './Home'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
