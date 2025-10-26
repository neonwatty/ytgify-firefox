import React from 'react';
import FeedbackScreen from '../overlay-wizard/screens/FeedbackScreen';

interface NewsletterWizardProps {
  onClose: () => void;
}

const NewsletterWizard: React.FC<NewsletterWizardProps> = ({ onClose }) => {
  const handleBack = () => {
    onClose();
  };

  return (
    <div className="ytgif-overlay-wizard">
      <div className="ytgif-wizard-container">
        <button
          onClick={onClose}
          className="ytgif-wizard-close"
          aria-label="Close newsletter wizard"
        >
          ×
        </button>
        <div className="ytgif-wizard-screens">
          <FeedbackScreen
            onBack={handleBack}
            onClose={onClose}
            isStandalone={true}
          />
        </div>
      </div>
    </div>
  );
};

export default NewsletterWizard;
