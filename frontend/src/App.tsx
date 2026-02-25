import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Bank Application</h1>
        <p className="text-gray-600 mb-6">Tailwind CSS v4 is now working correctly!</p>
        <div className="mb-6">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-200 w-full"
          >
            Count is: {count}
          </button>
        </div>
        <div className="text-sm text-gray-500 text-center">
          <p>Click the button to test interactivity</p>
          <p className="mt-2">
            Edit <code className="bg-gray-100 px-2 py-1 rounded">src/App.tsx</code> to continue
            development
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
