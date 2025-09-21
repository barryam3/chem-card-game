import type { ChemistryElement } from '../data';

interface CardProps {
  element: ChemistryElement;
  onClick?: () => void;
  isSelected?: boolean;
  isDisabled?: boolean;
  showDetails?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  element, 
  onClick, 
  isSelected = false, 
  isDisabled = false,
  showDetails = true 
}) => {
  const getImagePath = (atomicNumber: number, name: string) => {
    // Use Vite's asset resolution - it will automatically handle the correct path
    return new URL(`../assets/${atomicNumber}-${name}.png`, import.meta.url).href;
  };

  const getFamilyColor = (family: string) => {
    const colors: { [key: string]: string } = {
      'Nonmetal': '#90EE90',
      'Noble Gas': '#FFB6C1',
      'Alkali Metal': '#FF6B6B',
      'Alkaline Earth Metal': '#FFD93D',
      'Metalloid': '#6BCF7F',
      'Halogen': '#4ECDC4',
      'Lanthanide': '#45B7D1',
      'Actinide': '#96CEB4',
      'Transition Metal': '#FFEAA7',
      'Metal': '#DDA0DD'
    };
    return colors[family] || '#E0E0E0';
  };

  return (
    <button 
      type="button"
      className={`card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      style={{ borderColor: getFamilyColor(element.family) }}
    >
      <div className="card-header">
        <div className="atomic-number">{element.atomicNumber}</div>
        <div className="atomic-symbol">{element.atomicSymbol}</div>
      </div>
      
      <div className="card-image">
        <img 
          src={getImagePath(element.atomicNumber, element.name)} 
          alt={element.name}
          onError={(e) => {
            // Fallback if image doesn't exist
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      
      <div className="card-name">{element.name}</div>
      
      {showDetails && (
        <div className="card-details">
          <div className="mass-group">Mass: {element.massGroup}</div>
          <div className="family" style={{ backgroundColor: getFamilyColor(element.family) }}>
            {element.family}
          </div>
          {element.radioactive && (
            <div className="radioactive">☢️ Radioactive</div>
          )}
          {element.positiveIon && (
            <div className="ion positive">+{element.positiveIon}</div>
          )}
          {element.negativeIon && (
            <div className="ion negative">-{element.negativeIon}</div>
          )}
        </div>
      )}
    </button>
  );
};
