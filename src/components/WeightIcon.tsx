interface WeightIconProps {
  size?: number;
  className?: string;
}

export const WeightIcon: React.FC<WeightIconProps> = ({ 
  size = 14, // Increased default size from 12 to 14
  className = "" 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Scale weight icon - bigger and wider */}
    <g>
      {/* Main weight body - wider trapezoid shape */}
      <path d="M6 8 L18 8 L20 19 L4 19 Z" />
      
      {/* Top handle/hook */}
      <rect x="11" y="3" width="2" height="5" rx="1" />
      
      {/* Weight markings/ridges */}
      <line x1="5" y1="12" x2="19" y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      <line x1="5.5" y1="15" x2="18.5" y2="15" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      
      {/* Bottom edge highlight */}
      <line x1="4" y1="19" x2="20" y2="19" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
    </g>
  </svg>
);

// Alternative simpler weight icon (kettlebell style)
export const WeightIconSimple: React.FC<WeightIconProps> = ({ 
  size = 12, 
  className = "" 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Kettlebell-style weight */}
    <g>
      {/* Handle */}
      <path d="M8 6 C8 4, 10 4, 10 4 L14 4 C14 4, 16 4, 16 6 L16 8 L8 8 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Main weight body */}
      <ellipse cx="12" cy="15" rx="6" ry="5" />
    </g>
  </svg>
);

// Rock/stone icon (more literal interpretation of mass)
export const RockIcon: React.FC<WeightIconProps> = ({ 
  size = 12, 
  className = "" 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Irregular rock shape */}
    <path d="M6 18 C4 16, 4 14, 5 12 C6 10, 8 9, 10 8 C12 7, 14 7, 16 8 C18 9, 19 11, 20 13 C21 15, 20 17, 18 18 C16 19, 14 19, 12 18 C10 17, 8 18, 6 18 Z" />
    
    {/* Small details for texture */}
    <circle cx="10" cy="13" r="1" fill="rgba(255,255,255,0.3)" />
    <circle cx="15" cy="11" r="0.5" fill="rgba(255,255,255,0.2)" />
    <circle cx="13" cy="15" r="0.7" fill="rgba(0,0,0,0.2)" />
  </svg>
);
