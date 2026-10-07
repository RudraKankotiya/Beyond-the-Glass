import { Link } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <section>
      <PageHeader title="Page not found">
        There is no page at this address. It may have moved, or the link may be mistyped.
      </PageHeader>
      <div className="page-container pb-20">
        <Link to="/" className="btn btn-outline">
          Go to the home page
        </Link>
      </div>
    </section>
  );
}

export default NotFoundPage;
