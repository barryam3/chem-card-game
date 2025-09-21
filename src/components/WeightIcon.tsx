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
