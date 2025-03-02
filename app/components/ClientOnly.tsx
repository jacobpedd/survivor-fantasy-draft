import { useState, useEffect, ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders its children on the client side
 * Used for components that rely on browser APIs like window or navigator
 */
export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that renders a function only on the client side
 * This allows dynamic content that uses browser APIs like window.location
 */
export function ClientFunction<T>({ 
  children, 
  fallback = null 
}: { 
  children: () => T, 
  fallback?: T 
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return <>{isClient ? children() : fallback}</>;
}