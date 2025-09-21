import './FaceDownCard.scss';

interface FaceDownCardProps {
  className?: string;
}

export const FaceDownCard: React.FC<FaceDownCardProps> = ({ className = "" }) => {
  return (
    <div className={`face-down-card ${className}`}>
      <div className="question-mark">?</div>
    </div>
  );
};
