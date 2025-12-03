import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedbackModal from '../../../src/content/overlay-wizard/components/FeedbackModal';
import { browserMock, resetBrowserMocks } from '../__mocks__/browser-mocks';

// Set up global browser mock
(global as any).browser = browserMock;

// Mock the CSS file
jest.mock('../../../src/content/wizard-styles.css', () => ({}));

// Mock the feedback tracker
const mockRecordSurveyClicked = jest.fn();
const mockRecordFeedbackSubmitted = jest.fn();
jest.mock('../../../src/shared/feedback-tracker', () => ({
  feedbackTracker: {
    recordSurveyClicked: () => mockRecordSurveyClicked(),
    recordFeedbackSubmitted: (
      featureVotes: any,
      suggestion?: string,
      fromSurvey?: boolean
    ) => mockRecordFeedbackSubmitted(featureVotes, suggestion, fromSurvey),
  },
}));

// Mock openExternalLink
const mockOpenExternalLink = jest.fn();
jest.mock('../../../src/constants/links', () => ({
  openExternalLink: (url: string) => mockOpenExternalLink(url),
}));

describe('FeedbackModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    resetBrowserMocks(browserMock);
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with post-success trigger', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Nice GIF!')).toBeInTheDocument();
      expect(screen.getByText('Help us improve YTGify')).toBeInTheDocument();
    });

    it('should render with milestone trigger', () => {
      render(
        <FeedbackModal
          trigger="milestone"
          milestoneCount={10}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText("You've created 10 GIFs!")).toBeInTheDocument();
    });

    it('should render with time trigger', () => {
      render(
        <FeedbackModal
          trigger="time"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Thanks for using YTGify!')).toBeInTheDocument();
    });

    it('should render all feature vote cards', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Save to Cloud')).toBeInTheDocument();
      expect(screen.getByText('Community Gallery')).toBeInTheDocument();
      expect(screen.getByText('Slack Integration')).toBeInTheDocument();
      expect(screen.getByText('Discord Integration')).toBeInTheDocument();
    });

    it('should render suggestion textarea', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Have another idea?')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          'Tell us what feature would make YTGify better...'
        )
      ).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Maybe Later')).toBeInTheDocument();
      expect(screen.getByText('Submit Feedback')).toBeInTheDocument();
    });

    it('should render survey link button', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Take detailed survey')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when clicking close button', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking Maybe Later', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const maybeLaterButton = screen.getByText('Maybe Later');
      fireEvent.click(maybeLaterButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle survey link click', async () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const surveyButton = screen.getByText('Take detailed survey');
      fireEvent.click(surveyButton);

      await waitFor(() => {
        expect(mockRecordSurveyClicked).toHaveBeenCalled();
        expect(mockOpenExternalLink).toHaveBeenCalled();
      });
    });

    it('should allow typing in suggestion textarea', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(
        'Tell us what feature would make YTGify better...'
      );
      fireEvent.change(textarea, { target: { value: 'Add dark mode' } });

      expect(textarea).toHaveValue('Add dark mode');
    });

    it('should submit feedback and call onSubmit', async () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByText('Submit Feedback');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRecordFeedbackSubmitted).toHaveBeenCalled();
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should submit feedback with suggestion', async () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(
        'Tell us what feature would make YTGify better...'
      );
      fireEvent.change(textarea, { target: { value: 'Add dark mode' } });

      const submitButton = screen.getByText('Submit Feedback');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRecordFeedbackSubmitted).toHaveBeenCalledWith(
          expect.any(Array),
          'Add dark mode',
          false
        );
      });
    });
  });

  describe('Feature Voting', () => {
    it('should toggle upvote for a feature', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Find and click upvote button for Cloud Storage feature
      const upvoteButtons = screen.getAllByLabelText(/Upvote/);
      expect(upvoteButtons.length).toBeGreaterThan(0);
      fireEvent.click(upvoteButtons[0]);

      // Button should have active class
      expect(upvoteButtons[0]).toHaveClass('ytgif-vote-btn--active');
    });

    it('should toggle downvote for a feature', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const downvoteButtons = screen.getAllByLabelText(/Downvote/);
      expect(downvoteButtons.length).toBeGreaterThan(0);
      fireEvent.click(downvoteButtons[0]);

      expect(downvoteButtons[0]).toHaveClass('ytgif-vote-btn--active');
    });

    it('should toggle off vote when clicking same button again', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const upvoteButtons = screen.getAllByLabelText(/Upvote/);

      // Click once to vote
      fireEvent.click(upvoteButtons[0]);
      expect(upvoteButtons[0]).toHaveClass('ytgif-vote-btn--active');

      // Click again to toggle off
      fireEvent.click(upvoteButtons[0]);
      expect(upvoteButtons[0]).not.toHaveClass('ytgif-vote-btn--active');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible close button', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('should have proper button types', () => {
      render(
        <FeedbackModal
          trigger="post-success"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});
