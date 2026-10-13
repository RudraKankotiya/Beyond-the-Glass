import { Component } from 'react';
import ViewerMessage from './ViewerMessage.jsx';

// An error boundary catches errors thrown while rendering its children (for example a model
// file that is missing or corrupt) and shows a message instead of a blank/crashed page.
// React only supports error boundaries as class components.
class ViewerErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('3D viewer error:', error);
  }

  handleRetry = () => {
    this.props.onRetry?.(); // lets the viewer forget the failed download so it is fetched again
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ViewerMessage
          title="Model failed to load"
          action={
            <button type="button" onClick={this.handleRetry} className="btn btn-outline">
              Try again
            </button>
          }
        >
          The 3D file could not be downloaded or opened. Check your connection, then try again.
        </ViewerMessage>
      );
    }
    return this.props.children;
  }
}

export default ViewerErrorBoundary;
