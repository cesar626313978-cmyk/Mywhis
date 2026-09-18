import React from 'react';

interface PearLogoProps {
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
}

/**
 * PearLogo - Logotipo de Mywhis.
 * Diseñado con la misma estética geométrica, trazo redondeado y centro hueco
 * que el triángulo original de Superwhisper.
 */
export const PearLogo: React.FC<PearLogoProps> = ({ 
  className = "w-6 h-6", 
  strokeWidth = 2.6,
  filled = false 
}) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill={filled ? "currentColor" : "none"} 
      stroke="currentColor" 
      strokeWidth={filled ? 0 : strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
      aria-label="Mywhis Pear Logo"
    >
      {/* Tallo curvado superior */}
      <path d="M12 5.2 C12 3.4 13.2 2.2 15 2" />
      {/* Pequeño detalle de hoja superior orgánica */}
      <path d="M13.2 3.6 C14.5 3.2 15.8 3.6 16.2 4.4" />
      {/* Silueta de pera con bordes suaves y proporción idéntica al glifo original */}
      <path d="M12 5.4 C10.2 5.4 8.8 6.8 8.8 8.8 C8.8 10.3 9.4 11.5 8.9 12.8 C8 14.6 6 16.2 6 18.3 C6 20.8 8.6 22 12 22 C15.4 22 18 20.8 18 18.3 C18 16.2 16 14.6 15.1 12.8 C14.6 11.5 15.2 10.3 15.2 8.8 C15.2 6.8 13.8 5.4 12 5.4 Z" />
    </svg>
  );
};

export default PearLogo;
