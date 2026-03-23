import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import router from './Router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem' }}>로딩 중...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  </QueryClientProvider>
);

export default App;
