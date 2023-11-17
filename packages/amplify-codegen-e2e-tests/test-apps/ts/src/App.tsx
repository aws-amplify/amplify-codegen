import { useEffect } from 'react';
// import and use to avoid tree shaking
import * as models from './models';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';
// don't need to import API.ts becuase it is imported by graphql statements

function App() {
  useEffect(() => {
    console.log(models);
    console.log(queries);
    console.log(mutations);
    console.log(subscriptions);
  }, []);
  return <div></div>;
}

export default App;
