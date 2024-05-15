import SearchScreen from "./Pages/SearchScreen";
import CalulationScreen from "./Pages/CalculationScreen";
import { Route, Routes } from 'react-router-dom';

function App() {
  return (
    <>
    {/* Hel */}
      <Routes>
        <Route path="/" element={<SearchScreen />} />
        <Route path="/calulations" element={<CalulationScreen />} />
        {/* <Route path="/isotope_not_found" element={<IsotopeNotFound/>} /> */}
      </Routes>
    </>
  );
}

export default App;
