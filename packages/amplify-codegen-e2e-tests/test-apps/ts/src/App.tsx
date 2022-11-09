import { useEffect } from 'react';
import * as models from './models'; // import and use models to avoid tree shaking

function App() {
  useEffect(() => {
    console.log(models);
  }, []);
  return <div></div>;
}

export default App;
