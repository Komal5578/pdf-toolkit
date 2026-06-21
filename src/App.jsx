import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Compressor from './tools/Compressor';
import ImageToPdf from './tools/ImageToPdf';
import PdfToImages from './tools/PdfToImages';
import MergePdfs from './tools/MergePdfs';
import SplitPdf from './tools/SplitPdf';
import WordToPdf from './tools/WordToPdf';

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-mesh" />
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/compress" element={<Compressor />} />
          <Route path="/image-to-pdf" element={<ImageToPdf />} />
          <Route path="/pdf-to-images" element={<PdfToImages />} />
          <Route path="/merge" element={<MergePdfs />} />
          <Route path="/split" element={<SplitPdf />} />
          <Route path="/word-to-pdf" element={<WordToPdf />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
