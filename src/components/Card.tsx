import type { ChemistryElement } from "../data";
import './Card.scss';

interface CardProps {
	element: ChemistryElement;
	onClick?: () => void;
	isSelected?: boolean;
	isDisabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
	element,
	onClick,
	isSelected = false,
	isDisabled = false,
}) => {
	const getImagePath = (atomicNumber: number, name: string) => {
		// Since we're preserving original filenames, we can use a simple path
		return `/assets/${atomicNumber}-${name}.png`;
	};

	const getFamilyClassName = (family: string) => {
		return family.toLowerCase().replaceAll(" ", "-");
	};

	const renderIonSymbols = (count: number, type: 'positive' | 'negative') => {
		if (!count) return null;
		const symbol = type === 'positive' ? '➕' : '➖';
		return new Array(count).fill(0).map((_, index) => (
			<span key={index}>{symbol}</span>
		));
	};

	const renderMassSymbols = (massGroup: number, radioactive: boolean) => {
		const symbol = radioactive ? '☢️' : '🪨';
		return new Array(massGroup).fill(0).map((_, index) => (
			<span key={index}>{symbol}</span>
		));
	};

	return (
		<button
			type="button"
			className={`card ${getFamilyClassName(element.family)} ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
			onClick={!isDisabled ? onClick : undefined}
			disabled={isDisabled}
		>
			{/* Element name at the top */}
			<div className="name">{element.name}</div>
			
			{/* Family name below element name (for color blindness) */}
			<div className="family">{element.family}</div>
			
			{/* Element image in the center */}
			<div className="cartoon">
				<img
					src={getImagePath(element.atomicNumber, element.name)}
					alt={element.name}
					onError={(e) => {
						// Fallback if image doesn't exist
						e.currentTarget.style.display = "none";
					}}
				/>
			</div>
			
			{/* Negative ions on the left */}
			<div className="ion negative">
				{renderIonSymbols(element.negativeIon || 0, 'negative')}
			</div>
			
			{/* Positive ions on the right */}
			<div className="ion positive">
				{renderIonSymbols(element.positiveIon || 0, 'positive')}
			</div>
			
			{/* Mass symbols at the bottom center */}
			<div className="mass">
				{renderMassSymbols(element.massGroup, element.radioactive || false)}
			</div>
			
			{/* Atomic number at bottom left */}
			<div className="number">{element.atomicNumber}</div>
			
			{/* Atomic symbol at bottom right */}
			<div className="symbol">{element.atomicSymbol}</div>
			
			{/* Keep radioactive symbol for digital game */}
			{element.radioactive && (
				<div className="radioactive-indicator">☢️</div>
			)}
		</button>
	);
};
