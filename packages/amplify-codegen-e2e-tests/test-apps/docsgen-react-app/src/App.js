import { useState } from 'react';
import './App.css';
import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import { API, Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';
Amplify.configure(awsconfig);

function App() {
  // Input states
  const [schemaInputValue, setSchemaInputValue] = useState('scalar MyScalar');
  const [maxDepthInputValue, setMaxDepthInputValue] = useState('2');
  
  // Generated Operation result states
  const [queriesResult, setQueriesResult] = useState('');
  const [mutationsResult, setMutationsResult] = useState('');
  const [subsResult, setSubsResult] = useState('');
  const [fragmentsResult, setFragmentsResult] = useState('');

  // GraphQL Operation result states
  const [createTodoResult, setCreateTodoResult] = useState('');
  const [updateTodoResult, setUpdateTodoResult] = useState('');
  const [deleteTodoResult, setDeleteTodoResult] = useState('');
  const [getTodoResult, setGetTodoResult] = useState('');
  const [listTodoResult, setListTodoResult] = useState('');

  // Input state change handlers
  function handleSchemaInputChange(event) {
    setSchemaInputValue(event.target.value);
  }

  function handleMaxDepthInputChange(event) {
    setMaxDepthInputValue(event.target.value);
  }

  // Generate GraphQL documents handler
  function handleGenerateButtonClick(event) {
    const generatedResult = generateGraphQLDocuments(schemaInputValue, { maxDepth: Number(maxDepthInputValue) });
    setQueriesResult(JSON.stringify(Array.from(generatedResult.queries.entries())));
    setMutationsResult(JSON.stringify(Array.from(generatedResult.mutations.entries())));
    setSubsResult(JSON.stringify(Array.from(generatedResult.subscriptions.entries())));
    setFragmentsResult(JSON.stringify(Array.from(generatedResult.fragments.entries())));
  }

  // GraphQL operations handlers
  async function handleGraphQLOperationsButtonClick(event) {
    const generatedResult = generateGraphQLDocuments(schemaInputValue, { maxDepth: Number(maxDepthInputValue) });
    const todoDetails = {
      name: 'Todo 101',
      description: 'Do the task 101'
    };
    const newTodo = await API.graphql({ 
      query: generatedResult.mutations.get('createTodo'),
      variables: { input: todoDetails }
    });
    const todoId = newTodo?.data?.createTodo?.id;
    setCreateTodoResult(JSON.stringify(newTodo));

    const updatedTodo = await API.graphql({ 
      query: generatedResult.mutations.get('updateTodo'),
      variables: { input: { id: todoId, description: 'Updated the task 101' } }
    });
    setUpdateTodoResult(JSON.stringify(updatedTodo));

    const queriedTodo = await API.graphql({ 
      query: generatedResult.queries.get('getTodo'),
      variables: { id: todoId }
    });
    setGetTodoResult(JSON.stringify(queriedTodo));

    const allTodos = await API.graphql({ 
      query: generatedResult.queries.get('listTodos'),
    });
    setListTodoResult(JSON.stringify(allTodos));

    const deletedTodo = await API.graphql({ 
      query: generatedResult.mutations.get('deleteTodo'),
      variables: { input: { id: todoId } }
    });
    setDeleteTodoResult(JSON.stringify(deletedTodo));
  }

  return (
    <div className='App'>
      <input type="text" name="inputSchema" value={schemaInputValue} onChange={handleSchemaInputChange}/>
      <input type="text" name="maxDepth" value={maxDepthInputValue} onChange={handleMaxDepthInputChange}/>
      <button name="generateDocuments" onClick={handleGenerateButtonClick}>Generate GraphQL Operations</button>
      
      <div className="result">
        <div>
          <h3>Generated Queries</h3>
          <textarea name='queries' value={queriesResult}/>
        </div>
        <div>
          <h3>Generated Mutations</h3>
          <textarea name='mutations' value={mutationsResult}/>
        </div>
        <div>
          <h3>Generated Subscriptions</h3>
          <textarea name='subscriptions' value={subsResult}/>
        </div>
        <div>
          <h3>Generated Fragments</h3>
          <textarea name='fragments' value={fragmentsResult}/>
        </div>
      </div>

      <button name="testGraphQLOperations" onClick={handleGraphQLOperationsButtonClick}>Test Generated GraphQL Operations</button>

      <div className='operationResult'>
        <div>
          <h3>Create a Todo</h3>
          <textarea name='createTodoResult' value={createTodoResult}/>
        </div>
        <div>
          <h3>Update a Todo</h3>
          <textarea name='updateTodoResult' value={updateTodoResult}/>
        </div>
        <div>
          <h3>Query a Todo</h3>
          <textarea name='getTodoResult' value={getTodoResult}/>
        </div>
        <div>
          <h3>List all Todos</h3>
          <textarea name='listTodoResult' value={listTodoResult}/>
        </div>
        <div>
          <h3>Delete Todo</h3>
          <textarea name='deleteTodoResult' value={deleteTodoResult}/>
        </div>
      </div>
    </div>
  );
}

export default App;
