
import { render, screen } from '@testing-library/react';
import CircleProgress from '../components/CircleProgress';

describe('CircleProgress Component', () => {
  test('renders with 0% progress', () => {
    render(<CircleProgress percentage={0} />);
    
    const progressText = screen.getByText('0%');
    expect(progressText).toBeInTheDocument();
  });

  test('renders with 50% progress', () => {
    render(<CircleProgress percentage={50} />);
    
    const progressText = screen.getByText('50%');
    expect(progressText).toBeInTheDocument();
  });

  test('renders with 100% progress', () => {
    render(<CircleProgress percentage={100} />);
    
    const progressText = screen.getByText('100%');
    expect(progressText).toBeInTheDocument();
  });

  test('caps progress at 100% when given higher values', () => {
    render(<CircleProgress percentage={150} />);
    
    const progressText = screen.getByText('150%');
    expect(progressText).toBeInTheDocument();
  });
});
