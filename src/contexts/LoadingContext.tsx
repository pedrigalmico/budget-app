import { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  message: string;
  setMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading, message, setMessage }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card-elevated p-6 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500/30 border-t-primary-500"></div>
            <p className="text-ink-100">{message || 'Saving changes...'}</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
} 