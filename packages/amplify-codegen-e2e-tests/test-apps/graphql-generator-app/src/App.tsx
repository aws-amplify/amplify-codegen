import React, { useState } from 'react';
import { GeneratedOutput } from '@aws-amplify/graphql-generator';
import testCases from './testCases';

function TestCase({
  test,
  id,
}: {
	test: () => Promise<GeneratedOutput>;
	id: string;
}) {
	const [result, setResult] = useState<boolean>(false);
	const [started, setStarted] = useState<boolean>(false);
  const [output, setOutput] = useState<GeneratedOutput>({});
	return (
		<div id={id}>
			<button
				id={`${id}_button`}
				onClick={async () => {
					setStarted(true);
          try {
            const out = await test();
            setOutput(out);
            setResult(true);
          } catch {
            setResult(false);
          }
				}}
			>
				{id}
			</button>
			<span id={`${id}_result`}>{!started ? '⌛' : result ? '✅' : '❌'}</span>
      <span id={`${id}_output`}>{JSON.stringify(output)}</span>
		</div>
	);
}

function App() {
  return (
    <div className="App">
      {testCases.map((testCase) => <TestCase key={testCase.id} {...testCase} />)}
    </div>
  );
}

export default App;
